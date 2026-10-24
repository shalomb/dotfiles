// Tests for skill-tiers.ts. Run: bun test ~/.pi/agent/extensions/_lib/skill-tiers.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatLoadNotice, inventory, mergeManifests, onDemandSection, parseManifest, pickerOrder, resolveUserManifestPath, savings, tierOf, tok, visible } from "./skill-tiers";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "skill-tiers-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));
const put = (p: string, body = "x") => { mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, body); };

test("parseManifest tolerates junk and missing fields", () => {
	expect(parseManifest("not json")).toEqual({ tier1: [], tier2: [], tier3: [], hide: [] });
	expect(parseManifest(JSON.stringify({ tier1: ["a", 3, "b"], tier2: "oops" }))).toEqual({ tier1: ["a", "b"], tier2: [], tier3: [], hide: [] });
});

test("tierOf: unlisted skills default to tier 3; tier 1 wins over tier 2", () => {
	const m = { tier1: ["a"], tier2: ["a", "b"], tier3: [], hide: [] };
	expect([tierOf("a", m), tierOf("b", m), tierOf("zzz", m)]).toEqual([1, 2, 3]);
});

test("mergeManifests: project adds to tiers and tier3 demotes", () => {
	const user = { tier1: ["a", "b"], tier2: ["c"], tier3: [], hide: ["x"] };
	const project = { tier1: ["c"], tier2: ["d"], tier3: ["b"], hide: ["y"] };
	const m = mergeManifests(user, project);
	expect([tierOf("a", m), tierOf("b", m), tierOf("c", m), tierOf("d", m)]).toEqual([1, 3, 1, 2]);
	expect(m.hide.sort()).toEqual(["x", "y"]);
});

test("inventory lists scripts/references/assets files, ignoring SKILL.md and missing dirs", () => {
	put(join(root, "SKILL.md"));
	put(join(root, "scripts", "init.py"), "print()");
	put(join(root, "scripts", "lib", "helper.sh"));
	put(join(root, "references", "a.md"));
	expect(inventory(root)).toEqual({ scripts: ["init.py", "lib/helper.sh"], references: ["a.md"], assets: [] });
});

test("formatLoadNotice: names catalog + body tokens and what was NOT loaded", () => {
	const msg = formatLoadNotice({ name: "skill-creator", catalogTok: 57, bodyTok: 4400, inv: { scripts: ["init.py", "pack.py"], references: ["w.md"], assets: [] } });
	expect(msg).toContain("skill-creator");
	expect(msg).toContain("+57t catalog");
	expect(msg).toContain("4.4k body");
	expect(msg).toContain("scripts 2");
	expect(msg).toContain("references 1");
	expect(msg).not.toContain("assets");
	expect(msg).toContain("not loaded");
});

test("formatLoadNotice: skill with no bundled files says so", () => {
	expect(formatLoadNotice({ name: "uv", catalogTok: 30, bodyTok: 800, inv: { scripts: [], references: [], assets: [] } })).toContain("no bundled files");
});

test("onDemandSection lists tier-2 names, counts tier 3, and tells the model how to load", () => {
	const skills = ["a", "b", "c", "d"].map((name) => ({ name }));
	const s = onDemandSection(skills, { tier1: ["a"], tier2: ["b"], tier3: [], hide: [] }, new Set(), "/s");
	expect(s).toContain("b");
	expect(s).not.toMatch(/\ba\b,/);
	expect(s).toContain("2 more");
	expect(s).toContain("read");
});

test("onDemandSection omits already-loaded skills and is empty when nothing is hidden", () => {
	const skills = [{ name: "a" }, { name: "b" }];
	expect(onDemandSection(skills, { tier1: ["a"], tier2: ["b"], tier3: [], hide: [] }, new Set(["b"]), "/s")).toBe("");
});

test("savings: baseline minus what is still in the prompt", () => {
	const all = [{ name: "a", description: "x".repeat(400) }, { name: "b", description: "y".repeat(400) }];
	const s = savings(all, new Set(["a"]), "z".repeat(40));
	expect(s.fullTok).toBe(tok("a" + "x".repeat(400)) + tok("b" + "y".repeat(400)));
	expect(s.nowTok).toBe(tok("a" + "x".repeat(400)) + tok("z".repeat(40)));
	expect(s.savedTok).toBe(s.fullTok - s.nowTok);
});

test("hide: parsed, and hidden skills vanish from visible() and from the on-demand index", () => {
	expect(parseManifest(JSON.stringify({ hide: ["dup", 1] })).hide).toEqual(["dup"]);
	const skills = ["a", "b", "dup"].map((name) => ({ name }));
	const m = { tier1: ["a"], tier2: [], tier3: [], hide: ["dup"] };
	expect(visible(skills, m).map((s) => s.name)).toEqual(["a", "b"]);
	const section = onDemandSection(skills, m, new Set(), "/s");
	expect(section).toContain("1 more");
	expect(section).not.toContain("dup");
});

test("pickerOrder: tier 2 first, tier 3 next, loaded then tier 1 last; alphabetical within each", () => {
	const skills = ["t1b", "t3b", "t2b", "t1a", "t3a", "t2a", "ld"].map((name) => ({ name }));
	const m = { tier1: ["t1a", "t1b"], tier2: ["t2a", "t2b"], tier3: [], hide: [] };
	expect(pickerOrder(skills, m, new Set(["ld"])).map((s) => s.name)).toEqual(["t2a", "t2b", "t3a", "t3b", "ld", "t1a", "t1b"]);
});

test("pickerOrder: a loaded tier-2 skill drops into the already-loaded group", () => {
	const skills = ["a", "b"].map((name) => ({ name }));
	const m = { tier1: [], tier2: ["a", "b"], tier3: [], hide: [] };
	expect(pickerOrder(skills, m, new Set(["a"])).map((s) => s.name)).toEqual(["b", "a"]);
});

test("pickerOrder: pinned skills (repo-local) come first, A-Z, regardless of tier or loaded state", () => {
	const skills = ["a", "b", "r2", "r1"].map((name) => ({ name }));
	const m = { tier1: ["a"], tier2: [], tier3: [], hide: [] };
	expect(pickerOrder(skills, m, new Set(["r2"]), new Set(["r1", "r2"])).map((s) => s.name)).toEqual(["r1", "r2", "b", "a"]);
});

test("pickerOrder: pinned is optional; hidden pinned skills stay hidden", () => {
	const skills = ["x", "y"].map((name) => ({ name }));
	const m = { tier1: [], tier2: [], tier3: [], hide: ["y"] };
	expect(pickerOrder(skills, m, new Set()).map((s) => s.name)).toEqual(["x"]);
	expect(pickerOrder(skills, m, new Set(), new Set(["y"])).map((s) => s.name)).toEqual(["x"]);
});

test("parseManifest: parses optional role metadata fields", () => {
	const raw = JSON.stringify({
		role: "builder",
		model: "antigravity/gemini-3.8-flash",
		thinkingLevel: "low",
		fallbackModel: "anthropic/claude-sonnet-5-5",
		tier1: ["todo-navigator"],
		tier2: ["ast-grep"],
	});
	const m = parseManifest(raw);
	expect(m.role).toBe("builder");
	expect(m.model).toBe("antigravity/gemini-3.8-flash");
	expect(m.thinkingLevel).toBe("low");
	expect(m.fallbackModel).toBe("anthropic/claude-sonnet-5-5");
	expect(m.tier1).toEqual(["todo-navigator"]);
	expect(m.tier2).toEqual(["ast-grep"]);
	expect(m.tier3).toEqual([]);
	expect(m.hide).toEqual([]);
});

test("resolveUserManifestPath: priority resolution (PI_SKILL_MANIFEST -> PI_ROLE -> default)", () => {
	const agentDir = join(root, "agent");
	const customManifest = join(root, "custom-tiers.json");
	const rolesDir = join(agentDir, "roles");
	const builderRole = join(rolesDir, "builder.json");
	const defaultManifest = join(agentDir, "skill-tiers.json");

	put(customManifest, "{}");
	put(builderRole, "{}");
	put(defaultManifest, "{}");

	// 1. If PI_SKILL_MANIFEST is non-empty and exists -> returns custom path
	expect(resolveUserManifestPath({ PI_SKILL_MANIFEST: customManifest, PI_ROLE: "builder" }, agentDir)).toBe(customManifest);

	// If PI_SKILL_MANIFEST is set but file does not exist -> fall through to PI_ROLE
	expect(resolveUserManifestPath({ PI_SKILL_MANIFEST: join(root, "nonexistent.json"), PI_ROLE: "builder" }, agentDir)).toBe(builderRole);

	// 2. Else if PI_ROLE is non-empty and roles/<role>.json exists -> returns role manifest path
	expect(resolveUserManifestPath({ PI_ROLE: "builder" }, agentDir)).toBe(builderRole);

	// If PI_ROLE does not exist -> falls back to defaultManifest
	expect(resolveUserManifestPath({ PI_ROLE: "nonexistent" }, agentDir)).toBe(defaultManifest);

	// 3. Else returns defaultManifest
	expect(resolveUserManifestPath({}, agentDir)).toBe(defaultManifest);
});

