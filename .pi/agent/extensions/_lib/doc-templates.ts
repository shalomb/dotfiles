/**
 * The /doc template types (epicmap, readout, decision): structured JSON in, one HTML page out.
 * Rendering is the bundled Python dispatcher (doc-render/templates/template.py); stdlib only, no network.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_SCRIPT = join(HERE, "doc-render", "templates", "template.py");

/** Kept equal to the Python REGISTRY; a test compares it with `template.py --list`. */
export const TEMPLATE_TYPES = ["epicmap", "readout", "decision", "guide", "runbook", "changerecord", "postmortem", "onepager"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

/** The purpose each type files under in the library, and a short label. */
export const TEMPLATES: Record<TemplateType, { purpose: string; label: string }> = {
	decision: { purpose: "decision", label: "Decision: options, deadline and the one question to answer" },
	readout: { purpose: "report", label: "Read-out: what is known, what conflicts, what needs choosing" },
	epicmap: { purpose: "status", label: "Epic map: blockers and dependents of a Jira epic, from a local cache" },
	guide: { purpose: "guide", label: "Guide: numbered steps to reach one outcome" },
	runbook: { purpose: "runbook", label: "Runbook: operating procedure with checks and a rollback" },
	changerecord: { purpose: "changerecord", label: "Change record: what changes, the risk and the back-out" },
	postmortem: { purpose: "postmortem", label: "Post-mortem: timeline, cause and action items" },
	onepager: { purpose: "onepager", label: "One-pager: the whole case and the ask on a single page" },
};

type Env = Record<string, string | undefined>;

export const isTemplateType = (x: unknown): x is TemplateType => typeof x === "string" && (TEMPLATE_TYPES as readonly string[]).includes(x);

function run(args: string[], env?: Env): string {
	try {
		return execFileSync("python3", [TEMPLATE_SCRIPT, ...args], { encoding: "utf8", env: (env ?? process.env) as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"] });
	} catch (e) {
		const err = (e as { stderr?: string }).stderr?.trim();
		const line = err?.split("\n").find((l) => l.startsWith("error:"));
		throw new Error(line ?? err ?? `error: ${(e as Error).message}`);
	}
}

/** Render a structured input file to `out`. Throws the renderer's `error: <path>: <reason>` line on failure. */
export function renderTemplate(o: { type: TemplateType; input: string; out: string; env?: Env }): void {
	run([o.type, o.input, o.out], o.env);
}

/** Text with every private path replaced: the same Python classifier the renderers use, so there is one rule. */
export function redactPrivate(text: string, env?: Env, roots: string[] = []): string {
	try {
		return execFileSync("python3", [TEMPLATE_SCRIPT, "--redact", ...roots.flatMap((r) => ["--root", r])], { encoding: "utf8", input: text, env: (env ?? process.env) as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"] });
	} catch (e) {
		throw new Error(`error: cannot redact: ${(e as Error).message}`);
	}
}

/** The final-page gate: throws the dispatcher's `error: final page: ...` line when a private path survives in the file. */
export function checkPage(file: string, env?: Env, roots: string[] = []): void {
	run(["--check-page", file, ...roots.flatMap((r) => ["--root", r])], env);
}

/** A valid example input (JSON text) for a type. */
export function templateExample(type: TemplateType): string {
	return run(["--example", type]);
}
