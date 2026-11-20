// Pure /drive mechanical gate (G1-G6). Callers pass data in; no fs, git or LLM.
// Rules: docs/plans/goal-workflow/drive-roles.md ("Mechanical gate", "Review amendments").

export type GateLevel = "pass" | "warn" | "reject";
export interface GateInput {
	taskKind: "behaviour" | "refactor" | "spec";
	scope: string[];
	changed: { path: string; status: "A" | "M" | "D"; added: string[]; removed: string[] }[];
	scenarioAtBase?: number;
	scenarioAtHead?: number;
	glossary?: string[];
}
export interface GateCheck { id: "G1" | "G2" | "G3" | "G4" | "G5" | "G6"; level: GateLevel; reason: string }
export interface GateResult { verdict: GateLevel; checks: GateCheck[]; verifier: boolean; verifierReasons: string[] }

export const STEWARD_GLOBS: string[] = [
	"docs/domain/**/features/**",
	"**/*.acceptance.test.*",
	"**/dsl/**",
	"**/*.feature",
];
const LOCKFILES = ["bun.lock", "package-lock.json", "uv.lock"];

function globToRegExp(glob: string): RegExp {
	let re = "";
	for (let i = 0; i < glob.length; i++) {
		const c = glob[i];
		if (c === "*") {
			if (glob[i + 1] === "*") {
				if (glob[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; }
			} else re += "[^/]*";
		} else if (c === "?") re += "[^/]";
		else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	}
	return new RegExp(`^${re}$`);
}
const matchGlob = (glob: string, p: string): boolean => globToRegExp(glob).test(p);

export const isStewardPath = (p: string): boolean => STEWARD_GLOBS.some((g) => matchGlob(g, p));

const inScope = (scope: string[], p: string): boolean =>
	scope.some((s) => s === p || (s.endsWith("/") && p.startsWith(s)) || (/[*?]/.test(s) && matchGlob(s, p)));

const isTestFile = (p: string): boolean => /\.(test|spec)\.[^/]*$|_test\.[^/]*$/.test(p);
const isFeature = (p: string): boolean => p.endsWith(".feature");
const isDriverOrDsl = (p: string): boolean => matchGlob("**/drivers/**", p) || matchGlob("**/dsl/**", p);
const basename = (p: string): string => p.slice(p.lastIndexOf("/") + 1);

const ASSERT = /expect\(|assert/;
const NEW_TEST = /\b(?:test|it)\(|^\s*(?:\/\/\s*)?Scenario\b/;
const TRACE = /Scenario:|@KR/;
const STEP = /\bScenario\b|\b(?:Given|When|Then)\b/;
const PASCAL = /\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/g;

const check = (id: GateCheck["id"], level: GateLevel, reason: string): GateCheck => ({ id, level, reason });

function g1(i: GateInput): GateCheck {
	if (i.taskKind === "spec") return check("G1", "pass", "spec task: skipped");
	const { scenarioAtBase: b, scenarioAtHead: h } = i;
	if (b === undefined || h === undefined) return check("G1", "reject", "scenario not run at base and head");
	if (i.taskKind === "behaviour") {
		if (b !== 0 && h === 0) return check("G1", "pass", "red at base, green at head");
		return check("G1", "reject", `behaviour needs red at base and green at head (base=${b}, head=${h})`);
	}
	if (b === 0 && h === 0) return check("G1", "pass", "green at base and head");
	return check("G1", "reject", `refactor needs green at base and head (base=${b}, head=${h})`);
}

function g2(i: GateInput): GateCheck {
	if (i.taskKind === "spec") return check("G2", "pass", "spec task may touch Steward paths");
	const hit = i.changed.filter((c) => isStewardPath(c.path)).map((c) => c.path);
	return hit.length ? check("G2", "reject", `Steward path touched: ${hit.join(", ")}`) : check("G2", "pass", "no Steward path touched");
}

/** G3 on a diff alone: did it remove a Scenario, add @skip/@wip, or drop more assertions than it added? */
export const checkWeakening = (changed: GateInput["changed"]): GateCheck => g3({ changed } as GateInput);

function g3(i: GateInput): GateCheck {
	const bad: string[] = [];
	for (const c of i.changed) {
		if (isFeature(c.path)) {
			if (c.removed.some((l) => /^\s*Scenario\b/.test(l))) bad.push(`${c.path}: Scenario removed`);
			if (c.added.some((l) => /(^|\s)@(skip|wip)\b/.test(l))) bad.push(`${c.path}: @skip/@wip added`);
		}
		if (isTestFile(c.path)) {
			const rm = c.removed.filter((l) => ASSERT.test(l)).length;
			const ad = c.added.filter((l) => ASSERT.test(l)).length;
			if (rm > ad) bad.push(`${c.path}: assertions ${rm} removed > ${ad} added`);
		}
	}
	return bad.length ? check("G3", "reject", bad.join("; ")) : check("G3", "pass", "no scenario or assertion weakened");
}

function g4(i: GateInput): GateCheck {
	const out = i.changed.map((c) => c.path).filter((p) => !LOCKFILES.includes(basename(p)) && !inScope(i.scope, p));
	return out.length ? check("G4", "warn", `outside scope: ${out.join(", ")}`) : check("G4", "pass", "diff inside scope");
}

function g5(i: GateInput): GateCheck {
	const bad: string[] = [];
	for (const c of i.changed) {
		if (!isTestFile(c.path) && !isFeature(c.path)) continue;
		c.added.forEach((l, n) => {
			if (NEW_TEST.test(l) && !TRACE.test(l) && !(n > 0 && TRACE.test(c.added[n - 1]))) bad.push(`${c.path}: ${l.trim()}`);
		});
	}
	return bad.length ? check("G5", "warn", `new test without Scenario/@KR: ${bad.join("; ")}`) : check("G5", "pass", "new tests trace to a scenario");
}

function g6(i: GateInput): GateCheck {
	if (!i.glossary) return check("G6", "pass", "no glossary given: skipped");
	const known = new Set(i.glossary.map((t) => t.toLowerCase()));
	const unknown = new Set<string>();
	for (const c of i.changed) {
		for (const l of c.added) {
			if (!STEP.test(l)) continue;
			for (const w of l.match(PASCAL) ?? []) if (!known.has(w.toLowerCase())) unknown.add(w);
		}
	}
	return unknown.size ? check("G6", "warn", `not in glossary: ${[...unknown].join(", ")}`) : check("G6", "pass", "terms in glossary");
}

const RANK: Record<GateLevel, number> = { pass: 0, warn: 1, reject: 2 };

export function runGate(i: GateInput): GateResult {
	const checks = [g1(i), g2(i), g3(i), g4(i), g5(i), g6(i)];
	const verdict = checks.reduce<GateLevel>((w, c) => (RANK[c.level] > RANK[w] ? c.level : w), "pass");
	const verifierReasons = checks.filter((c) => c.level === "warn").map((c) => `${c.id} warn: ${c.reason}`);
	if (i.changed.some((c) => isDriverOrDsl(c.path))) verifierReasons.push("driver/DSL change");
	return { verdict, checks, verifier: verifierReasons.length > 0, verifierReasons };
}
