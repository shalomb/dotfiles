/**
 * Discover skills that live in the current repo under agent-tool dot-dirs
 * (.claude, .gemini, .github, .agent, .agents, .pi, .codex):
 *   <dot>/skills/<name>/SKILL.md   real skills
 *   <dot>/agents/*.md              agent definitions, usually plain prose; treated as skills
 *                                  (name = file name, description = **Role** line or first heading)
 * Pure fs reads, tested in repo-skills.test.ts. Used by /skills:loader's picker and loader.
 *
 * Scans cwd and its ancestors up to the git root (or just cwd outside a repo), never
 * above `stopAt` (home). Nearer directories win on a name clash.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const DOT_DIRS = [".claude", ".gemini", ".github", ".agent", ".agents", ".pi", ".codex"];
export const REPO_SKILL_DIRS = DOT_DIRS.map((d) => `${d}/skills`);
export const REPO_AGENT_DIRS = DOT_DIRS.map((d) => `${d}/agents`);

export interface RepoSkill { name: string; description: string; filePath: string; baseDir: string; source: string }

/** Minimal frontmatter reader: `key: value`, quoted values, and `>`/`|` blocks. Enough for name/description. */
export function parseFrontmatter(text: string): Record<string, string> {
	const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
	if (!m) return {};
	const out: Record<string, string> = {};
	const lines = m[1].split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
		if (!kv) continue;
		const [, key, raw] = kv;
		if (/^[>|][+-]?$/.test(raw.trim())) {
			const parts: string[] = [];
			while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
			out[key] = parts.join(" ");
		} else {
			out[key] = raw.trim().replace(/^(["'])(.*)\1$/, "$2");
		}
	}
	return out;
}

/** Description for a prose agent file: `**Role**: ...` line, else first markdown heading, else empty. */
function proseDescription(text: string): string {
	const role = /^\*{0,2}Role\*{0,2}\s*:\*{0,2}\s*(.+)$/im.exec(text);
	if (role) return role[1].replace(/\*+/g, "").trim();
	return /^#{1,6}\s+(.+)$/m.exec(text)?.[1].trim() ?? "";
}

const isDir = (p: string) => { try { return statSync(p).isDirectory(); } catch { return false; } };

/** cwd, then each parent up to (and including) the first dir holding `.git`; just [cwd] outside a repo. */
function scanRoots(cwd: string, stopAt: string): string[] {
	const chain: string[] = [];
	let dir = resolve(cwd);
	const stop = resolve(stopAt);
	for (;;) {
		chain.push(dir);
		if (existsSync(join(dir, ".git"))) return chain;
		const up = dirname(dir);
		if (up === dir || dir === stop) break;
		dir = up;
	}
	return [resolve(cwd)];
}

export function discoverRepoSkills(cwd: string, stopAt: string): RepoSkill[] {
	if (!isDir(cwd)) return [];
	const found = new Map<string, RepoSkill>();
	for (const root of scanRoots(cwd, stopAt)) {
		for (const sub of REPO_SKILL_DIRS) {
			const base = join(root, sub);
			if (!isDir(base)) continue;
			let entries: string[] = [];
			try { entries = readdirSync(base).sort(); } catch { continue; }
			for (const e of entries) {
				const filePath = join(base, e, "SKILL.md");
				if (!existsSync(filePath)) continue;
				let fm: Record<string, string> = {};
				try { fm = parseFrontmatter(readFileSync(filePath, "utf8")); } catch { continue; }
				const name = fm.name || e;
				if (found.has(name)) continue; // nearer (earlier) wins
				found.set(name, { name, description: fm.description ?? "", filePath, baseDir: join(base, e), source: relative(root, base) });
			}
		}
	}
	// Agent files come after real skills at every level so a skill wins a clash in the same dir.
	for (const root of scanRoots(cwd, stopAt)) {
		for (const sub of REPO_AGENT_DIRS) {
			const base = join(root, sub);
			if (!isDir(base)) continue;
			let entries: string[] = [];
			try { entries = readdirSync(base).sort(); } catch { continue; }
			for (const e of entries) {
				if (!/\.md$/i.test(e) || /^readme\.md$/i.test(e)) continue;
				const filePath = join(base, e);
				let text = "";
				try { if (!statSync(filePath).isFile()) continue; text = readFileSync(filePath, "utf8"); } catch { continue; }
				const fm = parseFrontmatter(text);
				const name = fm.name || e.replace(/(\.agent)?\.md$/i, "");
				if (found.has(name)) continue;
				found.set(name, { name, description: fm.description ?? proseDescription(text), filePath, baseDir: base, source: relative(root, base) });
			}
		}
	}
	return [...found.values()];
}
