// Pure YAML-workflow -> pi-subagents script compiler. No I/O, no eval of user text:
// every user string reaches the generated script as a JSON literal, and loop
// conditions are parsed against a tiny grammar (field op literal).

export type CompileResult = { ok: true; script: string } | { ok: false; errors: string[] };

const ID = /^[A-Za-z_][\w-]{0,63}$/;
const TYPES: Record<string, object> = {
	string: { type: "string" },
	integer: { type: "integer" },
	number: { type: "number" },
	boolean: { type: "boolean" },
	"string[]": { type: "array", items: { type: "string" } },
};
const REF = /\{([A-Za-z_][\w-]*)(?:\.([A-Za-z_]\w*))?\}/g;
const COND = /^\s*([A-Za-z_]\w*)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?|true|false|"[^"]*")\s*$/;
const MAX_LOOP = 10;

interface Stage {
	id: string;
	agent: string;
	task: string;
	skill?: string;
	output?: Record<string, string>;
	loop?: { from: string; while: string; max: number };
}
interface Span { from: number; to: number; k: number }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function compile(def: unknown): CompileResult {
	const errors: string[] = [];
	if (!isObj(def)) return { ok: false, errors: ["workflow must be an object"] };
	if (typeof def.name !== "string" || !def.name.trim()) errors.push("name is required");
	if (!Array.isArray(def.stages) || def.stages.length === 0) return { ok: false, errors: [...errors, "stages must be a non-empty list"] };

	const stages = def.stages as Stage[];
	const index = new Map<string, number>();
	stages.forEach((s, i) => {
		const at = `stage ${i + 1}`;
		if (!isObj(s)) return errors.push(`${at}: must be an object`);
		if (typeof s.id !== "string" || !ID.test(s.id)) errors.push(`${at}: invalid id (letters, digits, _ and -)`);
		else if (index.has(s.id)) errors.push(`${at}: duplicate id "${s.id}"`);
		else index.set(s.id, i);
		if (typeof s.agent !== "string" || !s.agent) errors.push(`${at}: agent is required`);
		if (typeof s.task !== "string" || !s.task) errors.push(`${at}: task is required`);
		if (s.skill !== undefined && typeof s.skill !== "string") errors.push(`${at}: skill must be a string`);
		if (s.output !== undefined) {
			if (!isObj(s.output) || Object.keys(s.output).length === 0) errors.push(`${at}: output must be a non-empty map of field: type`);
			else for (const [f, t] of Object.entries(s.output)) if (!TYPES[t as string]) errors.push(`${at}: output.${f} has unknown type "${t}" (${Object.keys(TYPES).join(", ")})`);
		}
	});
	if (errors.length) return { ok: false, errors };

	// loops
	const spans: Span[] = [];
	stages.forEach((s, i) => {
		if (!s.loop) return;
		const at = `stage "${s.id}"`;
		const l = s.loop;
		if (!Number.isInteger(l.max) || l.max < 1 || l.max > MAX_LOOP) errors.push(`${at}: loop.max must be an integer 1-${MAX_LOOP}`);
		const from = index.get(l.from);
		if (from === undefined || from > i) return errors.push(`${at}: loop.from "${l.from}" must be this stage or an earlier one`);
		if (!s.output) return errors.push(`${at}: loop needs an output schema to evaluate "while"`);
		const m = typeof l.while === "string" ? COND.exec(l.while) : null;
		if (!m) return errors.push(`${at}: loop.while must look like "field > 0" (field op number|true|false|"text")`);
		if (!(m[1] in s.output)) errors.push(`${at}: loop.while field "${m[1]}" is not in output`);
		if (spans.some((p) => from <= p.to && i >= p.from)) errors.push(`${at}: loops may not overlap or nest`);
		spans.push({ from, to: i, k: spans.length });
	});
	if (errors.length) return { ok: false, errors };
	const spanOf = (i: number) => spans.find((p) => i >= p.from && i <= p.to);

	// template references
	stages.forEach((s, i) => {
		for (const m of s.task.matchAll(REF)) {
			const [, name, field] = m;
			if (name === "input" && !field) continue;
			const j = index.get(name);
			if (j === undefined) { errors.push(`stage "${s.id}": unknown reference {${name}}`); continue; }
			const sp = spanOf(i);
			if (j >= i && !(sp && j >= sp.from && j <= sp.to)) errors.push(`stage "${s.id}": {${name}} must be defined earlier (or share a loop)`);
			if (field && !stages[j].output?.[field]) errors.push(`stage "${s.id}": {${name}.${field}} is not in ${name}'s output`);
		}
	});
	if (errors.length) return { ok: false, errors };

	// codegen
	const lit = JSON.stringify;
	const render = (task: string): string => {
		const parts: string[] = [];
		let last = 0;
		for (const m of task.matchAll(REF)) {
			const [whole, name, field] = m;
			if (name === "input" && !field) {
				parts.push(lit(task.slice(last, m.index)), `String(args.input ?? "")`);
			} else {
				const o = `out[${lit(name)}]`;
				const expr = field ? `(${o} && ${o}.structuredOutput ? String(${o}.structuredOutput[${lit(field)}] ?? "") : "")` : `(${o} ? ${o}.output : "")`;
				parts.push(lit(task.slice(last, m.index)), expr);
			}
			last = (m.index as number) + whole.length;
		}
		parts.push(lit(task.slice(last)));
		return parts.join(" + ");
	};
	const schemaOf = (o: Record<string, string>) =>
		lit({ type: "object", properties: Object.fromEntries(Object.entries(o).map(([f, t]) => [f, TYPES[t]])), required: Object.keys(o), additionalProperties: false });

	const lines: string[] = ["const out = {};"];
	stages.forEach((s, i) => {
		const sp = spanOf(i);
		if (sp && i === sp.from) lines.push(`for (let n${sp.k} = 0; ; n${sp.k}++) {`);
		const key = sp ? `${lit(s.id + "-")} + n${sp.k}` : lit(s.id);
		const fields = [`agent: ${lit(s.agent)}`, `task: ${render(s.task)}`];
		if (s.skill) fields.push(`skill: ${lit(s.skill)}`);
		if (s.output) fields.push(`outputSchema: ${schemaOf(s.output)}`);
		lines.push(`out[${lit(s.id)}] = await runs.run(${key}, { ${fields.join(", ")} });`);
		const lp = s.loop;
		if (sp && lp && i === sp.to) {
			const [, field, op, val] = COND.exec(lp.while) as RegExpExecArray;
			const o = `out[${lit(s.id)}].structuredOutput`;
			const cmp = op === "==" ? "===" : op === "!=" ? "!==" : op;
			lines.push(`if (!${o} || !(${o}[${lit(field)}] ${cmp} ${val}) || n${sp.k} + 1 >= ${lp.max}) break;`, "}");
		}
	});
	const last = lit(stages[stages.length - 1].id);
	lines.push(`return { output: out[${last}].output, structuredOutput: out[${last}].structuredOutput, stages: Object.keys(out) };`);
	return { ok: true, script: lines.join("\n") };
}
