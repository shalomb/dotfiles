// Tests for ../antigravity-prompt-shim.ts and its pure core. Run: cd _lib && bun test antigravity-prompt-shim
import { describe, expect, test } from "bun:test";
import shim from "../antigravity-prompt-shim.ts";
import { OPENER_REPLACEMENT, isFalse429, rewriteAntigravityPayload } from "./antigravity-prompt-shim.ts";

const TAIL = "\n\nAvailable tools:\n- read\n- bash\n\n# Project Context\nAGENTS.md body";
const PI_OPENER =
	"You are a coding assistant running inside pi, a coding agent harness. Help users inspect files, run commands, and modify code.";
// What pi-antigravity 0.14.0's sanitizeSystemPrompt emits (still rejected upstream).
const SANITIZED_OPENER =
	"You are a coding assistant running inside your development environment. Help users inspect files, run commands, and modify code.";

const payload = (text: string, extra: Record<string, unknown> = {}) => ({
	model: "gemini-4-argon-medium",
	request: { systemInstruction: { parts: [{ text }] }, contents: [{ role: "user", parts: [{ text: "hi" }] }], ...extra },
});
const sys = (p: ReturnType<typeof payload>) => p.request.systemInstruction.parts[0].text;

describe("rewriteAntigravityPayload", () => {
	test("rewrites the raw pi opener and keeps the tail byte-identical", () => {
		const out = rewriteAntigravityPayload(payload(PI_OPENER + TAIL));
		expect(out).toBeDefined();
		expect(sys(out as never)).toBe(OPENER_REPLACEMENT + TAIL);
	});

	test("rewrites the opener 0.14.0's own sanitizer produces", () => {
		const out = rewriteAntigravityPayload(payload(SANITIZED_OPENER + TAIL));
		expect(sys(out as never)).toBe(OPENER_REPLACEMENT + TAIL);
	});

	test("is idempotent: its own output is left alone", () => {
		const once = rewriteAntigravityPayload(payload(PI_OPENER + TAIL)) as never;
		expect(rewriteAntigravityPayload(once)).toBeUndefined();
	});

	test("is a no-op when upstream already fixed the opener", () => {
		expect(rewriteAntigravityPayload(payload("You are a coding agent helping the user." + TAIL))).toBeUndefined();
	});

	test("ignores payloads without an Antigravity systemInstruction", () => {
		expect(rewriteAntigravityPayload({ model: "claude", messages: [{ role: "user", content: "hi" }] })).toBeUndefined();
		expect(rewriteAntigravityPayload(undefined)).toBeUndefined();
		expect(rewriteAntigravityPayload(null)).toBeUndefined();
		expect(rewriteAntigravityPayload("str")).toBeUndefined();
	});

	test("does not mutate the input and preserves other fields", () => {
		const input = payload(PI_OPENER + TAIL, { tools: [{ name: "read" }] });
		const snapshot = JSON.stringify(input);
		const out = rewriteAntigravityPayload(input) as never as ReturnType<typeof payload>;
		expect(JSON.stringify(input)).toBe(snapshot);
		expect(out.model).toBe("gemini-4-argon-medium");
		expect((out.request as { tools: unknown }).tools).toEqual([{ name: "read" }]);
		expect(out.request.contents).toEqual(input.request.contents);
	});

	test("only rewrites an opener at the start of a part", () => {
		const text = `Note: ${PI_OPENER}${TAIL}`;
		expect(rewriteAntigravityPayload(payload(text))).toBeUndefined();
	});

	test("handles multiple parts, rewriting only matching ones", () => {
		const p = payload(PI_OPENER + TAIL);
		p.request.systemInstruction.parts.push({ text: "extra skill block" });
		const out = rewriteAntigravityPayload(p) as never as ReturnType<typeof payload>;
		expect(out.request.systemInstruction.parts[1].text).toBe("extra skill block");
		expect(sys(out)).toBe(OPENER_REPLACEMENT + TAIL);
	});
});

describe("isFalse429", () => {
	test("matches the generic exhausted error from antigravity", () => {
		expect(isFalse429("Antigravity API error (request-failed, ...): This model is unavailable right now (Resource has been exhausted (e.g. check quota).).")).toBe(true);
	});
	test("ignores unrelated errors", () => {
		expect(isFalse429("Overloaded")).toBe(false);
		expect(isFalse429(undefined)).toBe(false);
	});
});

type Handler = (event: unknown, ctx: unknown) => unknown;
function load(env: Record<string, string | undefined> = {}) {
	const handlers: Record<string, Handler> = {};
	const saved = { ...process.env };
	Object.assign(process.env, env);
	for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
	// biome-ignore lint/suspicious/noExplicitAny: minimal fake of ExtensionAPI
	shim({ on: (n: string, f: Handler) => { handlers[n] = f; } } as any);
	process.env = saved;
	return handlers;
}

describe("extension wiring", () => {
	test("before_provider_request rewrites the payload", () => {
		const h = load();
		const out = h.before_provider_request({ payload: payload(PI_OPENER + TAIL) }, {}) as never;
		expect(sys(out)).toBe(OPENER_REPLACEMENT + TAIL);
	});

	test("PI_AG_SHIM=0 disables the shim (kill switch)", () => {
		const h = load({ PI_AG_SHIM: "0" });
		expect(h.before_provider_request?.({ payload: payload(PI_OPENER + TAIL) }, {})).toBeUndefined();
	});

	test("message_end with a false-429 error notifies once with a pointer", () => {
		const h = load();
		const notes: string[] = [];
		const ctx = { hasUI: true, ui: { notify: (m: string) => notes.push(m) } };
		const msg = { message: { role: "assistant", stopReason: "error", errorMessage: "Antigravity API error: Resource has been exhausted (e.g. check quota)." } };
		h.message_end(msg, ctx);
		h.message_end(msg, ctx);
		expect(notes).toHaveLength(1);
		expect(notes[0]).toMatch(/antigravity-prompt-shim/);
	});
});
