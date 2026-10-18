// Run: bun test ~/.pi/agent/extensions/_lib/workflow.test.ts
import { expect, test } from "bun:test";
import { compile } from "./workflow";

type Call = { key: string; opts: any };
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/** Execute a compiled script against a scripted fake `runs`. */
async function exec(script: string, args: any, reply: (c: Call) => { output?: string; structuredOutput?: any }) {
	const calls: Call[] = [];
	const runs = {
		run: async (key: string, opts: any) => {
			const c = { key, opts };
			calls.push(c);
			return { ok: true, output: "", ...reply(c) };
		},
	};
	const result = await new AsyncFunction("runs", "args", script)(runs, args);
	return { calls, result };
}
const ok = (def: unknown) => {
	const r = compile(def);
	if (!r.ok) throw new Error(r.errors.join("; "));
	return r.script;
};
const errs = (def: unknown) => {
	const r = compile(def);
	return r.ok ? "" : r.errors.join("\n");
};

const linear = {
	name: "w",
	stages: [
		{ id: "a", agent: "scout", task: "Look at {input}" },
		{ id: "b", agent: "reviewer", skill: "code-review", task: "Review:\n{a}" },
	],
};

test("linear: stages run in order, {input} and {stage} are substituted", async () => {
	const { calls, result } = await exec(ok(linear), { input: "X" }, (c) => ({ output: `out-${c.key}` }));
	expect(calls.map((c) => c.key)).toEqual(["a", "b"]);
	expect(calls[0].opts).toMatchObject({ agent: "scout", task: "Look at X" });
	expect(calls[1].opts).toMatchObject({ agent: "reviewer", skill: "code-review", task: "Review:\nout-a" });
	expect(calls[0].opts.skill).toBeUndefined();
	expect(result.output).toBe("out-b");
});

test("task text with quotes/backticks/${} is data, never code", async () => {
	const evil = { name: "w", stages: [{ id: "a", agent: "scout", task: 'say "hi" `x` ${process.exit(1)} \\n {input}' }] };
	const { calls } = await exec(ok(evil), { input: "I" }, () => ({}));
	expect(calls[0].opts.task).toBe('say "hi" `x` ${process.exit(1)} \\n I');
});

test("output shorthand becomes a JSON schema; {stage.field} reads structuredOutput", async () => {
	const def = {
		name: "w",
		stages: [
			{ id: "r", agent: "reviewer", task: "go", output: { blockers: "integer", notes: "string" } },
			{ id: "n", agent: "scout", task: "fix {r.notes} ({r.blockers})" },
		],
	};
	const { calls } = await exec(ok(def), { input: "" }, (c) => (c.key === "r" ? { structuredOutput: { blockers: 2, notes: "no tests" } } : {}));
	expect(calls[0].opts.outputSchema).toEqual({
		type: "object",
		properties: { blockers: { type: "integer" }, notes: { type: "string" } },
		required: ["blockers", "notes"],
		additionalProperties: false,
	});
	expect(calls[1].opts.task).toBe("fix no tests (2)");
});

const loopDef = {
	name: "w",
	stages: [
		{ id: "plan", agent: "scout", task: "plan {input} fixing {review.notes}" },
		{ id: "review", agent: "reviewer", task: "review {plan}", output: { blockers: "integer", notes: "string" }, loop: { from: "plan", while: "blockers > 0", max: 3 } },
	],
};

test("loop repeats from..stage until condition false, with iteration-suffixed keys", async () => {
	let n = 0;
	const { calls } = await exec(ok({ ...loopDef, stages: [{ ...loopDef.stages[0], task: "plan {input}" }, loopDef.stages[1]] }), { input: "I" }, (c) =>
		c.key.startsWith("review") ? { structuredOutput: { blockers: n++ === 0 ? 1 : 0, notes: "n" } } : {},
	);
	expect(calls.map((c) => c.key)).toEqual(["plan-0", "review-0", "plan-1", "review-1"]);
});

test("loop is capped by max even if condition never clears", async () => {
	const { calls } = await exec(ok({ ...loopDef, stages: [{ ...loopDef.stages[0], task: "plan" }, loopDef.stages[1]] }), { input: "" }, (c) =>
		c.key.startsWith("review") ? { structuredOutput: { blockers: 9, notes: "n" } } : {},
	);
	expect(calls.filter((c) => c.key.startsWith("review")).length).toBe(3);
});

test("loop stops (no spin) when structuredOutput is missing", async () => {
	const { calls } = await exec(ok({ ...loopDef, stages: [{ ...loopDef.stages[0], task: "plan" }, loopDef.stages[1]] }), { input: "" }, () => ({}));
	expect(calls.length).toBe(2);
});

test("validation errors", () => {
	expect(errs(null)).toMatch(/object/);
	expect(errs({ name: "w", stages: [] })).toMatch(/stages/);
	expect(errs({ name: "w", stages: [{ id: "a", task: "t" }] })).toMatch(/agent/);
	expect(errs({ name: "w", stages: [{ id: "a", agent: "s" }] })).toMatch(/task/);
	expect(errs({ name: "w", stages: [{ id: "a", agent: "s", task: "t" }, { id: "a", agent: "s", task: "t" }] })).toMatch(/duplicate/i);
	expect(errs({ name: "w", stages: [{ id: "bad id", agent: "s", task: "t" }] })).toMatch(/id/);
	expect(errs({ name: "w", stages: [{ id: "a", agent: "s", task: "use {zzz}" }] })).toMatch(/zzz/);
	expect(errs({ name: "w", stages: [{ id: "a", agent: "s", task: "use {b}" }, { id: "b", agent: "s", task: "t" }] })).toMatch(/before|earlier|defined/i);
	expect(errs({ name: "w", stages: [{ id: "a", agent: "s", task: "t", output: { x: "weird" } }] })).toMatch(/type/i);
});

test("loop validation: needs max, sane bounds, known from, a typed 'while' field, no overlap", () => {
	const mk = (loop: unknown, withOutput = true) => ({
		name: "w",
		stages: [{ id: "a", agent: "s", task: "t" }, { id: "b", agent: "s", task: "t", ...(withOutput ? { output: { blockers: "integer" } } : {}), loop }],
	});
	expect(errs(mk({ from: "a", while: "blockers > 0" }))).toMatch(/max/);
	expect(errs(mk({ from: "a", while: "blockers > 0", max: 99 }))).toMatch(/max/);
	expect(errs(mk({ from: "nope", while: "blockers > 0", max: 2 }))).toMatch(/from/);
	expect(errs(mk({ from: "a", while: "rm -rf /", max: 2 }))).toMatch(/while/);
	expect(errs(mk({ from: "a", while: "other > 0", max: 2 }))).toMatch(/other/);
	expect(errs(mk({ from: "a", while: "blockers > 0", max: 2 }, false))).toMatch(/output/);
	expect(errs(mk({ from: "a", while: "blockers > 0", max: 2 }))).toBe("");
});
