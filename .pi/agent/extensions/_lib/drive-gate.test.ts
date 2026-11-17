// Run: bun test ~/.pi/agent/extensions/_lib/drive-gate.test.ts
// Rules: docs/plans/goal-workflow/drive-roles.md ("Mechanical gate", "Review amendments").
import { expect, test } from "bun:test";
import { isStewardPath, runGate, STEWARD_GLOBS, type GateInput } from "./drive-gate.ts";

type Ch = GateInput["changed"][number];
const ch = (path: string, added: string[] = [], removed: string[] = [], status: Ch["status"] = "M"): Ch => ({ path, status, added, removed });
const base = (o: Partial<GateInput> = {}): GateInput => ({
	taskKind: "behaviour", scope: ["src/"], changed: [ch("src/a.ts")], scenarioAtBase: 1, scenarioAtHead: 0, ...o,
});
const lvl = (i: GateInput, id: string) => runGate(i).checks.find((c) => c.id === id)!.level;

test("G1 behaviour passes when red at base and green at head", () => {
	expect(lvl(base(), "G1")).toBe("pass");
});
test("G1 behaviour rejects when already green at base", () => {
	expect(lvl(base({ scenarioAtBase: 0 }), "G1")).toBe("reject");
});
test("G1 behaviour rejects when still red at head", () => {
	expect(lvl(base({ scenarioAtHead: 1 }), "G1")).toBe("reject");
});
test("G1 refactor passes when green at base and head", () => {
	expect(lvl(base({ taskKind: "refactor", scenarioAtBase: 0 }), "G1")).toBe("pass");
});
test("G1 refactor rejects when red at base", () => {
	expect(lvl(base({ taskKind: "refactor" }), "G1")).toBe("reject");
});
test("G1 missing exit codes reject as not run", () => {
	const r = runGate(base({ scenarioAtBase: undefined, scenarioAtHead: undefined }));
	const g1 = r.checks.find((c) => c.id === "G1")!;
	expect(g1.level).toBe("reject");
	expect(g1.reason).toContain("not run");
});
test("G1 spec tasks skip the check", () => {
	expect(lvl(base({ taskKind: "spec", scenarioAtBase: undefined, scenarioAtHead: undefined }), "G1")).toBe("pass");
});

test("G2 behaviour task touching a Steward path rejects", () => {
	const i = base({ scope: ["docs/", "src/"], changed: [ch("docs/domain/x/features/a.feature")] });
	expect(lvl(i, "G2")).toBe("reject");
	expect(runGate(i).verdict).toBe("reject");
});
test("G2 spec task may touch Steward paths", () => {
	expect(lvl(base({ taskKind: "spec", scope: ["docs/"], changed: [ch("docs/domain/x/features/a.feature")] }), "G2")).toBe("pass");
});
test("G2 ordinary source path passes", () => {
	expect(lvl(base(), "G2")).toBe("pass");
});
test("G2 isStewardPath matches every steward glob shape", () => {
	expect(STEWARD_GLOBS.length).toBe(4);
	for (const p of ["docs/domain/c/features/deep/a.md", "src/x.acceptance.test.ts", "a/dsl/b.ts", "x/y.feature"]) expect(isStewardPath(p)).toBe(true);
	for (const p of ["src/a.ts", "docs/domain/c/readme.md", "src/x.test.ts"]) expect(isStewardPath(p)).toBe(false);
});

test("G3 removed Scenario in a feature file rejects", () => {
	const i = base({ taskKind: "spec", scope: ["docs/"], changed: [ch("docs/a.feature", [], ["  Scenario: gone"])] });
	expect(lvl(i, "G3")).toBe("reject");
});
test("G3 added @skip or @wip tag rejects", () => {
	for (const t of ["@skip", "  @wip"]) {
		expect(lvl(base({ taskKind: "spec", scope: ["docs/"], changed: [ch("docs/a.feature", [t])] }), "G3")).toBe("reject");
	}
});
test("G3 added Scenario in a feature file passes", () => {
	expect(lvl(base({ taskKind: "spec", scope: ["docs/"], changed: [ch("docs/a.feature", ["  Scenario: new"])] }), "G3")).toBe("pass");
});
test("G3 more removed assertions than added in a test file rejects", () => {
	const i = base({ changed: [ch("src/a.test.ts", ["expect(a).toBe(1)"], ["expect(a).toBe(1)", "assert.ok(b)"])] });
	expect(lvl(i, "G3")).toBe("reject");
});
test("G3 balanced assertions pass; non-test files ignored", () => {
	expect(lvl(base({ changed: [ch("src/a.test.ts", ["expect(a)"], ["expect(b)"])] }), "G3")).toBe("pass");
	expect(lvl(base({ changed: [ch("src/a.ts", [], ["expect(b)"])] }), "G3")).toBe("pass");
});
test("G3 applies to refactor tasks and *_test.* / *.spec.* files", () => {
	const i = base({ taskKind: "refactor", scenarioAtBase: 0, changed: [ch("src/a_test.py", [], ["assert x"])] });
	expect(lvl(i, "G3")).toBe("reject");
	expect(lvl(base({ changed: [ch("src/a.spec.ts", [], ["expect(1)"])] }), "G3")).toBe("reject");
});

test("G4 path inside scope passes (prefix, exact, glob)", () => {
	expect(lvl(base({ scope: ["src/"], changed: [ch("src/deep/a.ts")] }), "G4")).toBe("pass");
	expect(lvl(base({ scope: ["src/a.ts"], changed: [ch("src/a.ts")] }), "G4")).toBe("pass");
	expect(lvl(base({ scope: ["src/**/*.ts"], changed: [ch("src/x/y/a.ts")] }), "G4")).toBe("pass");
});
test("G4 path outside scope warns and triggers the Verifier", () => {
	const r = runGate(base({ scope: ["src/"], changed: [ch("lib/a.ts")] }));
	expect(r.checks.find((c) => c.id === "G4")!.level).toBe("warn");
	expect(r.verdict).toBe("warn");
	expect(r.verifier).toBe(true);
});
test("G4 single * does not cross directories; lockfiles allowed", () => {
	expect(lvl(base({ scope: ["src/*.ts"], changed: [ch("src/x/a.ts")] }), "G4")).toBe("warn");
	expect(lvl(base({ scope: ["src/"], changed: [ch("bun.lock"), ch("pkg/uv.lock")] }), "G4")).toBe("pass");
});

test("G5 new test with a Scenario comment on the previous line passes", () => {
	const i = base({ changed: [ch("src/a.test.ts", ["// Scenario: x", "test('x', () => {})"])] });
	expect(lvl(i, "G5")).toBe("pass");
});
test("G5 new test with @KR on the same line passes", () => {
	expect(lvl(base({ changed: [ch("src/a.test.ts", ["it('@KR1 x', () => {})"])] }), "G5")).toBe("pass");
});
test("G5 new test without a scenario trace warns", () => {
	const r = runGate(base({ changed: [ch("src/a.test.ts", ["test('x', () => {})"])] }));
	expect(r.checks.find((c) => c.id === "G5")!.level).toBe("warn");
	expect(r.verifier).toBe(true);
});
test("G5 ignores non-test files", () => {
	expect(lvl(base({ changed: [ch("src/a.ts", ["test('x', () => {})"])] }), "G5")).toBe("pass");
});

test("G6 unknown PascalCase word in a step warns", () => {
	const i = base({ glossary: ["Order"], changed: [ch("src/a.test.ts", ["// Scenario: x Given a WidgetFactory"])] });
	expect(lvl(i, "G6")).toBe("warn");
});
test("G6 glossary term passes", () => {
	const i = base({ glossary: ["OrderBook"], changed: [ch("src/a.test.ts", ["// Scenario: x Given an OrderBook"])] });
	expect(lvl(i, "G6")).toBe("pass");
});
test("G6 skipped when no glossary given", () => {
	expect(lvl(base({ changed: [ch("src/a.test.ts", ["Given a WidgetFactory"])] }), "G6")).toBe("pass");
});

test("verdict is the worst level and clean diff needs no Verifier", () => {
	const clean = runGate(base());
	expect(clean.verdict).toBe("pass");
	expect(clean.verifier).toBe(false);
	expect(clean.checks.map((c) => c.id)).toEqual(["G1", "G2", "G3", "G4", "G5", "G6"]);
});
test("verifier triggers on drivers/DSL path even when rejected", () => {
	const r = runGate(base({ scope: ["src/"], changed: [ch("src/drivers/http.ts")] }));
	expect(r.verifier).toBe(true);
	expect(r.verifierReasons).toContain("driver/DSL change");
	const rej = runGate(base({ scenarioAtBase: 0, changed: [ch("src/drivers/http.ts")] }));
	expect(rej.verdict).toBe("reject");
	expect(rej.verifier).toBe(true);
});
