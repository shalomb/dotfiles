// @ts-nocheck — throwaway spike run via `pi -e`; no tsconfig/node_modules here, so the LSP cannot resolve pi/node types.
/**
 * SPIKE: /skills:loader — tier-1 catalog + on-demand loading, fzf picker when no args. Throwaway; `pi -e`.
 *   /skills:loader             fzf popup (tab = multi) -> load the picks
 *   /skills:loader a b         load named skills (catalog entry + body message)
 *   /skills:loader status      what is in the catalog, token estimate
 * Tier 1 comes from SPIKE_TIER1 (comma list). Everything else is hidden until loaded.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PICKER = join(dirname(fileURLToPath(import.meta.url)), "skills-picker.sh");
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const tier1 = () => new Set((process.env.SPIKE_TIER1 ?? "modern-cli-overrides,git-commit-formatter").split(",").filter(Boolean));
const tok = (s: string) => Math.ceil(s.length / 4);
const log = (o: unknown) => process.env.SPIKE_LOG && appendFileSync(process.env.SPIKE_LOG, JSON.stringify(o) + "\n");

export default function (pi: ExtensionAPI) {
	let all: any[] = []; // full catalog, captured before filtering
	const loaded = new Set<string>();

	pi.on("session_start", async (_e: any, ctx: any) => {
		loaded.clear();
		for (const en of ctx.sessionManager?.getEntries?.() ?? [])
			if (en.type === "custom" && en.customType === "skills-loader") for (const n of en.data?.loaded ?? []) loaded.add(n);
		log({ ev: "session_start", restored: [...loaded] });
	});

	pi.on("before_agent_start", async (e: any) => {
		const o = e.systemPromptOptions;
		if ((o.skills ?? []).length > all.length) all = [...o.skills];
		const keep = tier1();
		o.skills = all.filter((s) => keep.has(s.name) || loaded.has(s.name));
		log({ ev: "before_agent_start", catalog: all.length, inPrompt: o.skills.map((s: any) => s.name) });
	});

	const row = (s: any) => {
		const state = loaded.has(s.name) ? "●" : tier1().has(s.name) ? "T1" : " ";
		const desc = String(s.description).replace(/\s+/g, " ").slice(0, 160);
		return [s.name, state, `${tok(s.name + s.description)}t`, desc, s.filePath].join("\t");
	};

	const load = (names: string[], ctx: any) => {
		const byName = new Map(all.map((s) => [s.name, s]));
		const ok: string[] = [], bad: string[] = [];
		for (const n of names) (byName.has(n) ? ok : bad).push(n);
		for (const n of ok) {
			loaded.add(n);
			const body = readFileSync(byName.get(n).filePath, "utf8");
			pi.sendMessage(
				{ customType: "skills-loader", content: `Skill loaded: ${n}\n\n${body}`, display: true, details: { name: n } },
				{ deliverAs: "nextTurn" },
			);
		}
		pi.appendEntry("skills-loader", { loaded: [...loaded] });
		const cost = ok.reduce((a, n) => a + tok(byName.get(n).description), 0);
		log({ ev: "load", ok, bad });
		ctx.ui.notify(
			`skills:loader loaded ${ok.length} (${ok.join(", ") || "-"}) ~+${cost}t catalog${bad.length ? `; unknown: ${bad.join(", ")}` : ""}`,
			bad.length ? "error" : "info",
		);
	};

	pi.registerCommand("skills:loader", {
		description: "Load skills on demand (fzf picker with no args; `status`; or skill names)",
		handler: async (args: string, ctx: any) => {
			const names = args.trim().split(/\s+/).filter(Boolean);
			if (names[0] === "status") {
				const live = all.filter((s) => tier1().has(s.name) || loaded.has(s.name));
				const t = live.reduce((a, s) => a + tok(s.name + s.description), 0);
				log({ ev: "status", live: live.length, all: all.length });
				return ctx.ui.notify(`skills catalog: ${live.length}/${all.length} in prompt (~${t}t); loaded: ${[...loaded].join(", ") || "-"}`, "info");
			}
			if (names.length) return load(names, ctx);
			if (!all.length) return ctx.ui.notify("skills:loader: catalog not captured yet (send one message first)", "error");
			if (!process.env.TMUX) return ctx.ui.notify("skills:loader picker needs tmux; pass names instead", "error");
			const dir = mkdtempSync(join(tmpdir(), "skills-loader-"));
			const rows = join(dir, "rows.tsv"), out = join(dir, "out.txt");
			writeFileSync(rows, all.map(row).join("\n") + "\n");
			const res = await pi.exec("tmux", [
				"display-popup", "-E", "-d", ctx.cwd, "-w", "95%", "-h", "90%",
				"-T", " skills:loader (tab=multi, ⏎=load) ", "sh", "-c", `bash ${q(PICKER)} ${q(rows)} ${q(out)}`,
			]);
			let picked: string[] = [];
			try { picked = readFileSync(out, "utf8").split("\n").filter(Boolean); } catch {}
			rmSync(dir, { recursive: true, force: true });
			if (res.code !== 0 && !picked.length) return ctx.ui.notify(`skills:loader popup closed (${res.code})`, "info");
			if (!picked.length) return ctx.ui.notify("skills:loader: nothing selected", "info");
			load(picked, ctx);
		},
	});
}
