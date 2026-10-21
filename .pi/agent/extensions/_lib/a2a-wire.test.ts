// Run: bun test ~/.pi/agent/extensions/_lib/a2a-wire.test.ts
// Wiring test: a fake pi drives the real extension logic through the events pi emits.
import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lastAssistantText, wireA2A } from "./a2a-wire";

type Handler = (e: any, ctx: any) => unknown;
function fakePi() {
	const handlers = new Map<string, Handler[]>();
	const sent: { text: string; opts: any }[] = [];
	let aborted = 0;
	const pi = {
		on: (ev: string, h: Handler) => { handlers.set(ev, [...(handlers.get(ev) ?? []), h]); return () => {}; },
		sendUserMessage: async (text: string, opts: any) => { sent.push({ text, opts }); },
	};
	const ctx = { abort: () => { aborted++; }, sessionManager: { getSessionId: () => "sess-1" }, cwd: "/work" };
	const emit = async (ev: string, e: any = {}) => { for (const h of handlers.get(ev) ?? []) await h({ type: ev, ...e }, ctx); };
	return { pi, ctx, emit, sent, aborts: () => aborted };
}
let dir: string;
let stop: (() => Promise<void>) | undefined;
afterEach(async () => { await stop?.(); stop = undefined; if (dir) rmSync(dir, { recursive: true, force: true }); });

async function boot() {
	dir = mkdtempSync(join(tmpdir(), "a2a-wire-"));
	const f = fakePi();
	const wired = wireA2A(f.pi as any, { stateDir: dir, env: { TMUX_PANE: "%9" } });
	await f.emit("session_start", { reason: "startup" });
	stop = () => f.emit("session_shutdown", { reason: "quit" });
	const info = JSON.parse(readFileSync(join(dir, "sess-1.a2a.json"), "utf8"));
	const rpc = (method: string, params: unknown, token = info.token) =>
		fetch(info.url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then((r) => r.json() as Promise<any>);
	const send = (text: string, blocking = false) => rpc("message/send", { message: { role: "user", parts: [{ kind: "text", text }] }, configuration: { blocking } });
	return { ...f, wired, info, rpc, send };
}

test("lastAssistantText takes the final assistant text block and ignores tool calls and thinking", () => {
	const msgs = [
		{ role: "user", content: "hi" },
		{ role: "assistant", content: [{ type: "text", text: "first" }] },
		{ role: "assistant", content: [{ type: "thinking", thinking: "hm" }, { type: "text", text: "final" }, { type: "toolCall", name: "x" }] },
	];
	expect(lastAssistantText(msgs as any)).toBe("final");
	expect(lastAssistantText([{ role: "assistant", content: [{ type: "toolCall" }] }] as any)).toBe("");
	expect(lastAssistantText([] as any)).toBe("");
});

test("session_start serves an endpoint and writes a 0600 info file in a 0700 dir", async () => {
	const t = await boot();
	expect(t.info.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
	expect(t.info.token.length).toBeGreaterThanOrEqual(32);
	expect(t.info).toMatchObject({ sessionId: "sess-1", pid: process.pid, tmuxPane: "%9", cwd: "/work" });
	expect(statSync(join(dir, "sess-1.a2a.json")).mode & 0o777).toBe(0o600);
	expect(statSync(dir).mode & 0o777).toBe(0o700);
});

test("a remote message is injected as a follow-up user message", async () => {
	const t = await boot();
	await t.send("do the thing");
	expect(t.sent).toEqual([{ text: "do the thing", opts: { deliverAs: "followUp" } }]);
});

test("full round trip: submitted -> working -> completed with the assistant reply", async () => {
	const t = await boot();
	const sub = await t.send("ping");
	const id = sub.result.id;
	await t.emit("message_start", { message: { role: "user", content: "ping" } });
	expect((await t.rpc("tasks/get", { id })).result.status.state).toBe("working");
	await t.emit("message_end", { message: { role: "assistant", content: [{ type: "text", text: "pong" }] } });
	await t.emit("agent_settled", { aborted: false });
	const done = (await t.rpc("tasks/get", { id })).result;
	expect(done.status.state).toBe("completed");
	expect(done.artifacts[0].parts[0].text).toBe("pong");
});

test("user message content may be an array of text blocks", async () => {
	const t = await boot();
	const id = (await t.send("arr")).result.id;
	await t.emit("message_start", { message: { role: "user", content: [{ type: "text", text: "arr" }] } });
	expect((await t.rpc("tasks/get", { id })).result.status.state).toBe("working");
});

test("a human prompt does not touch a queued remote task", async () => {
	const t = await boot();
	const id = (await t.send("remote")).result.id;
	await t.emit("message_start", { message: { role: "user", content: "typed by a human" } });
	await t.emit("agent_settled", { aborted: false });
	expect((await t.rpc("tasks/get", { id })).result.status.state).toBe("submitted");
});

test("a blocking UI prompt shows as input-required and clears when it ends", async () => {
	const t = await boot();
	const id = (await t.send("q")).result.id;
	await t.emit("message_start", { message: { role: "user", content: "q" } });
	await t.emit("ui_prompt_start", { kind: "select", title: "Which colour?" });
	const blocked = (await t.rpc("tasks/get", { id })).result;
	expect(blocked.status.state).toBe("input-required");
	expect(blocked.status.message.parts[0].text).toBe("Which colour?");
	await t.emit("ui_prompt_end", { kind: "select" });
	expect((await t.rpc("tasks/get", { id })).result.status.state).toBe("working");
});

test("cancel aborts the live run; an aborted settle does not resurrect the task", async () => {
	const t = await boot();
	const id = (await t.send("x")).result.id;
	await t.emit("message_start", { message: { role: "user", content: "x" } });
	const c = await t.rpc("tasks/cancel", { id });
	expect(c.result.status.state).toBe("canceled");
	expect(t.aborts()).toBe(1);
	await t.emit("agent_settled", { aborted: true });
	expect((await t.rpc("tasks/get", { id })).result.status.state).toBe("canceled");
});

test("wrong token is refused and delivers nothing", async () => {
	const t = await boot();
	const r = await fetch(t.info.url, { method: "POST", headers: { authorization: "Bearer nope", "content-type": "application/json" }, body: "{}" });
	expect(r.status).toBe(401);
	expect(t.sent).toEqual([]);
});

test("session_shutdown stops the server and removes the info file; a second shutdown is harmless", async () => {
	const t = await boot();
	await t.emit("session_shutdown", { reason: "quit" });
	stop = undefined;
	await expect(fetch(`${t.info.url}/.well-known/agent-card.json`)).rejects.toBeTruthy();
	expect(() => statSync(join(dir, "sess-1.a2a.json"))).toThrow();
	await t.emit("session_shutdown", { reason: "quit" });
});

test("a new session in the same process gets a fresh endpoint and the old record is replaced", async () => {
	const t = await boot();
	const old = t.info.url;
	await t.emit("session_shutdown", { reason: "new" });
	await t.emit("session_start", { reason: "new" });
	const fresh = JSON.parse(readFileSync(join(dir, "sess-1.a2a.json"), "utf8"));
	expect(fresh.url).not.toBe(old);
	expect(fresh.token).not.toBe(t.info.token);
});
