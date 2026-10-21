// @ts-nocheck — extension runs inside pi; no tsconfig/node_modules here, so the LSP cannot resolve pi/node types.
/**
 * /skills:loader — tiered skills catalog with on-demand loading. Logic: _lib/skill-tiers.ts (tested).
 *   /skills:loader             fzf popup (tab = multi) -> load the picks; also lists repo-local skills (_lib/repo-skills.ts)
 *   /skills:loader a b         load named skills (catalog entry + body message)
 *   /skills:loader status      tiers, catalog tokens now vs full, savings, what is loaded
 * Tiers come from ~/.pi/agent/skill-tiers.json (+ <cwd>/.pi/skill-tiers.json). Unlisted = tier 3.
 * Tier 1 stays in the catalog; tiers 2/3 are hidden and summarised in one `skills_on_demand` prompt section.
 * SKILLS_TIERS=off disables all filtering (baseline for measurements). SKILLS_LOG=<file> logs events as JSONL.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRepoSkills } from "./_lib/repo-skills";
import { type Manifest, formatLoadNotice, inventory, loadManifest, mergeManifests, onDemandSection, pickerOrder, savings, tierOf, tok, visible } from "./_lib/skill-tiers";

const HERE = dirname(fileURLToPath(import.meta.url));
const PICKER = join(HERE, "_lib", "skills-picker.sh");
const USER_MANIFEST = join(homedir(), ".pi", "agent", "skill-tiers.json");
const SKILLS_DIR = join(homedir(), ".pi", "agent", "skills");
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const off = () => process.env.SKILLS_TIERS === "off";
const log = (o: unknown) => process.env.SKILLS_LOG && appendFileSync(process.env.SKILLS_LOG, JSON.stringify(o) + "\n");
const manifestFor = (cwd?: string): Manifest =>
	mergeManifests(loadManifest(USER_MANIFEST), cwd ? loadManifest(join(cwd, ".pi", "skill-tiers.json")) : { tier1: [], tier2: [], tier3: [], hide: [] });

export default function (pi: ExtensionAPI) {
	let all: any[] = []; // full catalog, captured before filtering
	const loaded = new Set<string>();

	pi.on("session_start", async (_e: any, ctx: any) => {
		loaded.clear();
		for (const en of ctx.sessionManager?.getEntries?.() ?? [])
			if (en.type === "custom" && en.customType === "skills-loader") for (const n of en.data?.loaded ?? []) loaded.add(n);
		log({ ev: "session_start", restored: [...loaded] });
	});

	const shown = (m: Manifest) => new Set(all.filter((s) => tierOf(s.name, m) === 1 || loaded.has(s.name)).map((s) => s.name));

	pi.on("before_agent_start", async (e: any) => {
		const o = e.systemPromptOptions;
		if ((o.skills ?? []).length > all.length) all = [...o.skills];
		if (off()) return log({ ev: "before_agent_start", tiers: "off", catalog: all.length });
		const m = manifestFor(o.cwd);
		const keep = shown(m);
		o.skills = all.filter((s) => keep.has(s.name));
		const section = onDemandSection(all, m, loaded, SKILLS_DIR);
		if (section) o.sections = { ...o.sections, skills_on_demand: section };
		log({ ev: "before_agent_start", catalog: all.length, inPrompt: o.skills.map((s: any) => s.name), sectionTok: tok(section) });
	});

	// Diagnostic: size of the prompt as finally rendered (after every before_agent_start hook).
	pi.on("agent_start", async (_e: any, ctx: any) => {
		try { const sp = ctx.getSystemPrompt(); log({ ev: "agent_start", promptChars: sp.length, skillTags: (sp.match(/<skill>/g) ?? []).length, hasOnDemand: sp.includes("skills_on_demand"), cliOverrides: sp.includes("<modern_cli_overrides>") }); } catch (err) { log({ ev: "agent_start", err: String(err) }); }
	});

	// Commands can read the options directly, so no prior turn is needed to learn the catalog.
	const ensureAll = (ctx: any) => {
		if (all.length) return;
		try { all = [...(ctx.getSystemPromptOptions?.().skills ?? [])]; } catch {}
	};

	// Row = name \t display \t path. fzf shows only `display` (name first, fixed width) and returns `name`.
	const row = (s: any, m: Manifest) => {
		const state = loaded.has(s.name) ? "● " : `T${tierOf(s.name, m)}`;
		const src = s.repoSource ? `[repo ${s.repoSource}] ` : "";
		const desc = (src + String(s.description)).replace(/\s+/g, " ").replace(/\t/g, " ").slice(0, 200);
		const nm = s.name.padEnd(32).slice(0, 32);
		const rest = `${state}  ${String(tok(s.name + s.description)).padStart(4)}t  ${desc}`;
		// Already in the prompt (tier 1 or loaded): dimmed. Name and rest are separate tab fields so fzf can search the name alone.
		const dim = tierOf(s.name, m) === 1 || loaded.has(s.name);
		const display = dim ? `\x1b[2m${nm}\x1b[0m\t\x1b[2m${rest}\x1b[0m` : `${nm}\t${rest}`;
		return [s.name, display, s.filePath].join("\t");
	};

	// Picker/load candidates: pi's catalog plus repo-local skills (.claude/.gemini/.github/.agent/... under cwd..git root).
	// Repo skills never enter the prompt catalog or on-demand index; they are only loadable here. Pi's own entry wins on a name clash.
	const candidates = (ctx: any) => {
		const have = new Set(all.map((s) => s.name));
		const repo = discoverRepoSkills(ctx.cwd, homedir()).filter((s) => !have.has(s.name)).map((s) => ({ ...s, repoSource: s.source }));
		return [...all, ...repo];
	};

	const load = (names: string[], ctx: any) => {
		const byName = new Map(candidates(ctx).map((s) => [s.name, s]));
		const ok: string[] = [], bad: string[] = [], notes: string[] = [];
		for (const n of names) (byName.has(n) ? ok : bad).push(n);
		for (const n of ok) {
			const s = byName.get(n);
			loaded.add(n);
			const body = readFileSync(s.filePath, "utf8");
			pi.sendMessage(
				{ customType: "skills-loader", content: `Skill loaded: ${n}\n\n${body}`, display: false, details: { name: n } },
				{ deliverAs: "nextTurn" },
			);
			notes.push(formatLoadNotice({ name: n, catalogTok: tok(s.name + s.description), bodyTok: tok(body), inv: inventory(s.baseDir ?? dirname(s.filePath)) }));
		}
		pi.appendEntry("skills-loader", { loaded: [...loaded] });
		log({ ev: "load", ok, bad, notes });
		if (notes.length) ctx.ui.notify(notes.join("\n"), "info");
		if (bad.length) ctx.ui.notify(`skills:loader: unknown skill(s): ${bad.join(", ")}`, "error");
	};

	const status = (ctx: any) => {
		const m = manifestFor(ctx.cwd);
		const keep = off() ? new Set(all.map((s) => s.name)) : shown(m);
		const section = off() ? "" : onDemandSection(all, m, loaded, SKILLS_DIR);
		const sv = savings(all, keep, section);
		const vis = visible(all, m);
		const n = (t: number) => vis.filter((s) => tierOf(s.name, m) === t).length;
		log({ ev: "status", ...sv, all: all.length, inPrompt: keep.size });
		ctx.ui.notify(
			`skills catalog: ${keep.size}/${all.length} in prompt${off() ? " (tiers OFF)" : ""}\n` +
				`tiers: T1 ${n(1)} · T2 ${n(2)} · T3 ${n(3)} · hidden ${all.length - vis.length}\n` +
				`catalog cost ~${sv.nowTok}t now vs ~${sv.fullTok}t full → saving ~${sv.savedTok}t per turn\n` +
				`loaded: ${[...loaded].join(", ") || "-"}`,
			"info",
		);
	};

	pi.registerCommand("skills:loader", {
		description: "Load skills on demand (fzf picker with no args, incl. repo-local .claude/.gemini/.github/.agent skills; `status` shows tiers and savings; or skill names)",
		handler: async (args: string, ctx: any) => {
			ensureAll(ctx);
			const names = args.trim().split(/\s+/).filter(Boolean);
			if (names[0] === "status") return status(ctx);
			if (names.length) return load(names, ctx);
			if (!all.length) return ctx.ui.notify("skills:loader: could not read the skills catalog from this session", "error");
			if (!process.env.TMUX) return ctx.ui.notify("skills:loader picker needs tmux; pass names instead", "error");
			const m = manifestFor(ctx.cwd);
			const ordered = pickerOrder(candidates(ctx), m, loaded, new Set(candidates(ctx).filter((s) => s.repoSource).map((s) => s.name)));
			const dir = mkdtempSync(join(tmpdir(), "skills-loader-"));
			const rows = join(dir, "rows.tsv"), out = join(dir, "out.txt");
			writeFileSync(rows, ordered.map((s) => row(s, m)).join("\n") + "\n");
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
