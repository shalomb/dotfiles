/**
 * Skill tiering logic for the /skills:loader extension (pure; tested in skill-tiers.test.ts).
 *   tier 1  always in the system-prompt catalog
 *   tier 2  hidden; named in a one-line "on demand" index so the model can ask for them
 *   tier 3  hidden; only counted in that index (default for unlisted skills)
 * Manifests: ~/.pi/agent/skill-tiers.json (user) merged with <cwd>/.pi/skill-tiers.json (project).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export interface Manifest { tier1: string[]; tier2: string[]; tier3: string[]; hide: string[] }
export interface Inventory { scripts: string[]; references: string[]; assets: string[] }

export const tok = (s: string) => Math.ceil(s.length / 4);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function parseManifest(raw: string): Manifest {
	try {
		const j = JSON.parse(raw);
		return { tier1: strs(j?.tier1), tier2: strs(j?.tier2), tier3: strs(j?.tier3), hide: strs(j?.hide) };
	} catch {
		return { tier1: [], tier2: [], tier3: [], hide: [] };
	}
}

export function loadManifest(path: string): Manifest {
	try { return parseManifest(readFileSync(path, "utf8")); } catch { return { tier1: [], tier2: [], tier3: [], hide: [] }; }
}

/** Project adds to the user's tiers; `tier3` in the project demotes a skill out of tiers 1 and 2. */
export function mergeManifests(user: Manifest, project: Manifest): Manifest {
	const demote = new Set(project.tier3);
	const u = (a: string[], b: string[]) => [...new Set([...a, ...b])].filter((n) => !demote.has(n));
	return { tier1: u(user.tier1, project.tier1), tier2: u(user.tier2, project.tier2), tier3: [...new Set([...user.tier3, ...project.tier3])], hide: [...new Set([...user.hide, ...project.hide])] };
}

/** Skills not hidden by the manifest. Hidden ones stay on disk and loadable by name; they just leave the picker and index. */
export function visible<T extends { name: string }>(skills: T[], m: Manifest): T[] {
	return skills.filter((s) => !m.hide.includes(s.name));
}

export function tierOf(name: string, m: Manifest): 1 | 2 | 3 {
	if (m.tier1.includes(name)) return 1;
	if (m.tier2.includes(name)) return 2;
	return 3;
}

function walk(dir: string, rel = "", depth = 0): string[] {
	if (depth > 3 || !existsSync(dir)) return [];
	const out: string[] = [];
	for (const e of readdirSync(dir).sort()) {
		const p = join(dir, e), r = rel ? `${rel}/${e}` : e;
		try { statSync(p).isDirectory() ? out.push(...walk(p, r, depth + 1)) : out.push(r); } catch {}
	}
	return out;
}

/** Bundled files next to a SKILL.md. They are never loaded by the loader; the model reads them on demand. */
export function inventory(baseDir: string): Inventory {
	return { scripts: walk(join(baseDir, "scripts")), references: walk(join(baseDir, "references")), assets: walk(join(baseDir, "assets")) };
}

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

export function formatLoadNotice(o: { name: string; catalogTok: number; bodyTok: number; inv: Inventory }): string {
	const parts = ([["scripts", o.inv.scripts], ["references", o.inv.references], ["assets", o.inv.assets]] as const)
		.filter(([, f]) => f.length)
		.map(([n, f]) => `${n} ${f.length}`);
	const files = parts.length ? `bundled ${parts.join(", ")} (not loaded; read on demand)` : "no bundled files";
	return `skills:loader ${o.name}: +${o.catalogTok}t catalog, ~${k(o.bodyTok)} body; ${files}`;
}

/** One compact prompt section so the model knows hidden skills exist and how to get them. */
export function onDemandSection(skills: { name: string }[], m: Manifest, loaded: Set<string>, skillsDir: string): string {
	const hidden = visible(skills, m).filter((s) => tierOf(s.name, m) !== 1 && !loaded.has(s.name));
	if (!hidden.length) return "";
	const t2 = hidden.filter((s) => tierOf(s.name, m) === 2).map((s) => s.name);
	const t3 = hidden.length - t2.length;
	const lines = ["Skills not listed above are available on demand."];
	if (t2.length) lines.push(`Frequently used: ${t2.join(", ")}.`);
	if (t3) lines.push(`${t3} more are rarely needed; list them with: fd SKILL.md ${skillsDir}`);
	lines.push("To use one, read its SKILL.md (<skills dir>/<name>/SKILL.md) and follow it. The user can also run /skills:loader.");
	return lines.join("\n");
}

export function savings(all: { name: string; description: string }[], shown: Set<string>, sectionText: string) {
	const cost = (s: { name: string; description: string }) => tok(s.name + s.description);
	const fullTok = all.reduce((a, s) => a + cost(s), 0);
	const nowTok = all.filter((s) => shown.has(s.name)).reduce((a, s) => a + cost(s), 0) + tok(sectionText);
	return { fullTok, nowTok, savedTok: fullTok - nowTok };
}

/** Picker order: `pinned` (repo-local) first, then tier 2, tier 3, then what is already in the prompt (loaded, then tier 1); A-Z within each. */
export function pickerOrder<T extends { name: string }>(skills: T[], m: Manifest, loaded: Set<string>, pinned: Set<string> = new Set()): T[] {
	const rank = (n: string) => (pinned.has(n) ? -1 : tierOf(n, m) === 1 ? 3 : loaded.has(n) ? 2 : tierOf(n, m) === 2 ? 0 : 1);
	return visible(skills, m).sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}
