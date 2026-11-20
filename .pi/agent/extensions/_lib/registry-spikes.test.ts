// Spike tests for the pi-find hypotheses (docs/plans/pi-find-ux/handoff.md).
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRegistry, type Registry } from "./registry";
import { ftsSearch, refreshFts } from "./registry-fts";
import { defaultResumeDeps, resolveTargetWorktree, type ResumeSession } from "./registry-resume";

/** Deterministic PRNG so the spikes do not flake. */
function rng(seed: number) {
	let s = seed >>> 0;
	return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const word = (r: () => number) => Array.from({ length: 5 + Math.floor(r() * 6) }, () => LETTERS[Math.floor(r() * 26)]).join("");
const vocabulary = (r: () => number, n: number) => Array.from({ length: n }, () => word(r));
const pick = <T>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

function insertAll(db: Registry, rows: { id: string; digest: string; terms: string; last: string }[]) {
	const ins = db.query(`INSERT OR REPLACE INTO sessions (id,file,cwd,repo,started,status,last_activity,digest,terms,mtime_ms,size) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
	db.exec("BEGIN");
	for (const r of rows) ins.run(r.id, `/f/${r.id}.jsonl`, "/r", "/r", r.last, "ended", r.last, r.digest, r.terms, 1, r.digest.length);
	db.exec("COMMIT");
}
const stamp = (i: number) => new Date(Date.UTC(2026, 0, 1) + i * 60000).toISOString();

function synthetic(count: number, seed: number, wordsPerDigest: number, wordsPerTerms: number) {
	const r = rng(seed);
	const vocab = vocabulary(r, 3000);
	const rows = Array.from({ length: count }, (_, i) => ({
		id: `s${i}`,
		digest: Array.from({ length: wordsPerDigest }, () => pick(r, vocab)).join(" "),
		terms: Array.from({ length: wordsPerTerms }, () => pick(r, vocab)).join(" "),
		last: stamp(i),
	}));
	return { r, vocab, rows };
}

describe("H1 recall: one term in three wrong, target in top 5", () => {
	test("at least 18 of 20 synthetic queries find the target", () => {
		const { r, vocab, rows } = synthetic(400, 7, 30, 60);
		const db = openRegistry(":memory:");
		insertAll(db, rows);
		refreshFts(db);
		let found = 0;
		for (let q = 0; q < 20; q++) {
			const target = rows[Math.floor(r() * rows.length)];
			const own = target.digest.split(" ");
			const terms = [pick(r, own), pick(r, own), pick(r, own)];
			const bad = Math.floor(r() * 3);
			// alternate a typo (two letters swapped mid-word) with a wholly different word
			terms[bad] = q % 2 ? terms[bad].slice(0, 2) + terms[bad].slice(3, 4) + terms[bad][2] + terms[bad].slice(4) : pick(r, vocab);
			if (ftsSearch(db, terms, 5).includes(target.id)) found++;
		}
		console.log(`H1 recall ${found}/20`);
		expect(found).toBeGreaterThanOrEqual(18);
	});
});

describe("H2 speed: p95 <= 300 ms at 5000 sessions", () => {
	test("ftsSearch p95 over 10 runs", () => {
		const { r, rows } = synthetic(5000, 11, 60, 200);
		const dir = mkdtempSync(join(tmpdir(), "spike-h2-"));
		const db = openRegistry(join(dir, "registry.db"));
		try {
			insertAll(db, rows);
			const t0 = performance.now();
			refreshFts(db);
			console.log(`H2 index build ${(performance.now() - t0).toFixed(0)} ms`);
			const times: number[] = [];
			for (let i = 0; i < 10; i++) {
				const own = rows[Math.floor(r() * rows.length)].digest.split(" ");
				const terms = [pick(r, own), pick(r, own), word(r)];
				const t = performance.now();
				ftsSearch(db, terms, 20);
				times.push(performance.now() - t);
			}
			times.sort((a, b) => a - b);
			const p95 = times[Math.ceil(0.95 * times.length) - 1];
			console.log(`H2 p95 ${p95.toFixed(1)} ms (max ${times[times.length - 1].toFixed(1)})`);
			expect(p95).toBeLessThanOrEqual(300);
		} finally {
			db.close();
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("H3 resume", () => {
	const git = (cwd: string, ...a: string[]) => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	function fixture(linked: string[]) {
		const repo = realpathSync(mkdtempSync(join(tmpdir(), "h3-")));
		git(repo, "init", "-q", "-b", "main");
		git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init");
		mkdirSync(join(repo, ".worktrees"));
		for (const n of linked) git(repo, "worktree", "add", "-q", "-b", n, join(repo, ".worktrees", n));
		return repo;
	}
	const mk = (repo: string, i: number, cwd: string, wt: string | null): ResumeSession => ({ id: `s${i}`, cwd, repo, worktree: wt, worktree_path: wt ? join(repo, ".worktrees", wt) : null, branch: wt, profile: null });

	test("H3 resume never top level when a worktree exists (real git worktrees)", () => {
		const repo = fixture(["a", "b", "c"]);
		try {
			git(repo, "worktree", "remove", "--force", join(repo, ".worktrees", "c"));
			const sessions: ResumeSession[] = [];
			let i = 0;
			for (const n of ["a", "b", "c", "gone"]) for (const sub of ["", "/src"]) sessions.push(mk(repo, i++, join(repo, ".worktrees", n) + sub, n));
			for (let k = 0; k < 20; k++) sessions.push(mk(repo, i++, repo, null), mk(repo, i++, join(repo, "sub", String(k)), null));
			let top = 0;
			for (const s of sessions) {
				const r = resolveTargetWorktree(s, defaultResumeDeps);
				if (r.kind === "worktree" && r.path === repo) top++;
				if (r.kind === "pick" && r.candidates.some((c) => c.path === repo)) top++;
				expect(r.kind === "create").toBe(false);
			}
			expect(top).toBe(0);
			expect(resolveTargetWorktree(mk(repo, 900, join(repo, ".worktrees/a/src"), "a"), defaultResumeDeps)).toEqual({ kind: "worktree", path: join(repo, ".worktrees/a") });
			expect(resolveTargetWorktree(mk(repo, 901, join(repo, ".worktrees/c"), "c"), defaultResumeDeps).kind).toBe("pick");
		} finally { rmSync(repo, { recursive: true, force: true }); }
	});

	test("H3 resume with no worktrees creates one instead of using the top level", () => {
		const repo = fixture([]);
		try { expect(resolveTargetWorktree(mk(repo, 1, repo, null), defaultResumeDeps).kind).toBe("create"); }
		finally { rmSync(repo, { recursive: true, force: true }); }
	});
});
