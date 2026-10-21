// Run: bun test ~/.pi/agent/extensions/_lib/a2a-agent.test.ts
import { expect, test } from "bun:test";
import { A2AAgent, type Port } from "./a2a-agent";

function make(over: Partial<Port> = {}, opts: { blockTimeoutMs?: number; maxTasks?: number } = {}) {
	const delivered: { text: string; taskId: string }[] = [];
	const aborted: number[] = [];
	const port: Port = { deliver: (text, taskId) => void delivered.push({ text, taskId }), abort: () => void aborted.push(1), ...over };
	let n = 0;
	const agent = new A2AAgent(port, { name: "test", url: "http://127.0.0.1:1", newId: () => `id${++n}`, now: () => 1000, ...opts });
	return { agent, delivered, aborted };
}
const send = (agent: A2AAgent, text: string, extra: Record<string, unknown> = {}, method = "message/send") =>
	agent.handleRpc({ jsonrpc: "2.0", id: 1, method, params: { message: { role: "user", parts: [{ kind: "text", text }], ...extra.message as object }, configuration: extra.configuration } }) as Promise<any>;
const get = (agent: A2AAgent, id: string) => agent.handleRpc({ jsonrpc: "2.0", id: 2, method: "tasks/get", params: { id } }) as Promise<any>;

test("card: names the agent, advertises bearer auth and no streaming", () => {
	const c: any = make().agent.card();
	expect(c).toMatchObject({ name: "test", url: "http://127.0.0.1:1", capabilities: { streaming: false } });
	expect(c.securitySchemes).toBeTruthy();
	expect(Array.isArray(c.skills)).toBe(true);
});

test("send: returns a submitted task and delivers the text parts to the agent", async () => {
	const { agent, delivered } = make();
	const r = await send(agent, "hello");
	expect(r.result).toMatchObject({ kind: "task", id: "id1", status: { state: "submitted" } });
	expect(delivered).toEqual([{ text: "hello", taskId: "id1" }]);
});

test("send: non-text parts are ignored; text parts are joined; empty text is invalid params", async () => {
	const { agent, delivered } = make();
	await agent.handleRpc({ jsonrpc: "2.0", id: 1, method: "message/send", params: { message: { role: "user", parts: [{ kind: "text", text: "a" }, { kind: "file", file: {} }, { kind: "text", text: "b" }] } } });
	expect(delivered[0].text).toBe("a\nb");
	const bad: any = await send(agent, "   ");
	expect(bad.error.code).toBe(-32602);
	expect(delivered).toHaveLength(1);
});

test("both method spellings work: message/send + tasks/get and SendMessage + GetTask", async () => {
	const { agent } = make();
	const r: any = await send(agent, "x", {}, "SendMessage");
	expect(r.result.id).toBe("id1");
	const g: any = await agent.handleRpc({ jsonrpc: "2.0", id: 3, method: "GetTask", params: { id: "id1" } });
	expect(g.result.status.state).toBe("submitted");
});

test("lifecycle: run start -> working, run end -> completed with the reply as an artifact", async () => {
	const { agent } = make();
	await send(agent, "go");
	agent.onRunStart();
	expect((await get(agent, "id1")).result.status.state).toBe("working");
	agent.onRunEnd({ text: "the answer" });
	const t = (await get(agent, "id1")).result;
	expect(t.status.state).toBe("completed");
	expect(t.artifacts[0].parts[0]).toEqual({ kind: "text", text: "the answer" });
});

test("a run that starts synchronously inside deliver() still lands on its own task", async () => {
	const holder: { agent?: A2AAgent } = {};
	const { agent } = make({ deliver: () => holder.agent?.onRunStart() });
	holder.agent = agent;
	await send(agent, "go");
	expect((await get(agent, "id1")).result.status.state).toBe("working");
});

test("a run already in progress when the task arrives does not complete it", async () => {
	const { agent } = make();
	await send(agent, "queued behind a human prompt");
	agent.onRunEnd({ text: "human's reply" }); // earlier run finishing
	expect((await get(agent, "id1")).result.status.state).toBe("submitted");
	agent.onRunStart(); // the queued follow-up starts
	agent.onRunEnd({ text: "mine" });
	expect((await get(agent, "id1")).result.artifacts[0].parts[0].text).toBe("mine");
});

test("tasks are served FIFO: starts promote the oldest submitted task", async () => {
	const { agent } = make();
	await send(agent, "one");
	await send(agent, "two");
	agent.onRunStart();
	expect((await get(agent, "id1")).result.status.state).toBe("working");
	expect((await get(agent, "id2")).result.status.state).toBe("submitted");
	agent.onRunEnd({ text: "r1" });
	agent.onRunStart();
	agent.onRunEnd({ text: "r2" });
	expect((await get(agent, "id2")).result.artifacts[0].parts[0].text).toBe("r2");
});

test("input-required: blocked on a human, then back to working", async () => {
	const { agent } = make();
	await send(agent, "go");
	agent.onRunStart();
	agent.onInputRequired("Which colour?");
	const t = (await get(agent, "id1")).result;
	expect(t.status.state).toBe("input-required");
	expect(t.status.message.parts[0].text).toBe("Which colour?");
	agent.onInputResolved();
	expect((await get(agent, "id1")).result.status.state).toBe("working");
});

test("failure: a run that ends with an error fails the task and keeps the message", async () => {
	const { agent } = make();
	await send(agent, "go");
	agent.onRunStart();
	agent.onRunEnd({ error: "model exploded" });
	const t = (await get(agent, "id1")).result;
	expect(t.status.state).toBe("failed");
	expect(t.status.message.parts[0].text).toBe("model exploded");
});

test("blocking send resolves when the task completes", async () => {
	const { agent } = make();
	const p = send(agent, "go", { configuration: { blocking: true } });
	await Promise.resolve();
	agent.onRunStart();
	setTimeout(() => agent.onRunEnd({ text: "done" }), 5);
	const r = await p;
	expect(r.result.status.state).toBe("completed");
	expect(r.result.artifacts[0].parts[0].text).toBe("done");
});

test("blocking send also returns on input-required, and on timeout with the current state", async () => {
	const a = make();
	const p1 = send(a.agent, "go", { configuration: { blocking: true } });
	await Promise.resolve();
	a.agent.onRunStart();
	a.agent.onInputRequired("q?");
	expect((await p1).result.status.state).toBe("input-required");
	const b = make({}, { blockTimeoutMs: 20 });
	const r = await send(b.agent, "never starts", { configuration: { blocking: true } });
	expect(r.result.status.state).toBe("submitted");
});

test("cancel: submitted tasks are canceled; working ones abort the run; finished ones refuse", async () => {
	const { agent, aborted } = make();
	await send(agent, "a");
	const c1: any = await agent.handleRpc({ jsonrpc: "2.0", id: 9, method: "tasks/cancel", params: { id: "id1" } });
	expect(c1.result.status.state).toBe("canceled");
	await send(agent, "b");
	agent.onRunStart();
	const c2: any = await agent.handleRpc({ jsonrpc: "2.0", id: 9, method: "tasks/cancel", params: { id: "id2" } });
	expect(c2.result.status.state).toBe("canceled");
	expect(aborted).toHaveLength(1);
	agent.onRunEnd({ text: "late" }); // the aborted run's end must not resurrect it
	expect((await get(agent, "id2")).result.status.state).toBe("canceled");
	const c3: any = await agent.handleRpc({ jsonrpc: "2.0", id: 9, method: "tasks/cancel", params: { id: "id1" } });
	expect(c3.error.code).toBe(-32002);
});

test("errors: unknown task, unknown method, bad envelope", async () => {
	const { agent } = make();
	expect(((await get(agent, "nope")) as any).error.code).toBe(-32001);
	expect(((await agent.handleRpc({ jsonrpc: "2.0", id: 1, method: "nope" })) as any).error.code).toBe(-32601);
	expect(((await agent.handleRpc({ id: 1, method: "tasks/get" })) as any).error.code).toBe(-32600);
	expect(((await agent.handleRpc("junk")) as any).error.code).toBe(-32600);
	expect(((await get(agent, undefined as any)) as any).error.code).toBe(-32602);
});

test("contextId: taken from the message when given, otherwise minted", async () => {
	const { agent } = make();
	expect((await send(agent, "a", { message: { contextId: "ctx-9" } })).result.contextId).toBe("ctx-9");
	expect((await send(agent, "b")).result.contextId).toBeTruthy();
});

test("memory is bounded: oldest finished tasks are evicted past maxTasks", async () => {
	const { agent } = make({}, { maxTasks: 3 });
	for (let i = 0; i < 5; i++) {
		await send(agent, `t${i}`);
		agent.onRunStart();
		agent.onRunEnd({ text: "r" });
	}
	expect(((await get(agent, "id1")) as any).error.code).toBe(-32001);
	expect(((await get(agent, "id5")) as any).result.status.state).toBe("completed");
});

// ---- precise correlation: by the user message pi actually received ----
test("onUserMessage promotes the task whose text matches, not just the oldest", async () => {
	const { agent } = make();
	await send(agent, "one");
	await send(agent, "two");
	agent.onUserMessage("two");
	expect((await get(agent, "id2")).result.status.state).toBe("working");
	expect((await get(agent, "id1")).result.status.state).toBe("submitted");
});

test("a user message matching no task (a human prompt) changes nothing", async () => {
	const { agent } = make();
	await send(agent, "remote task");
	agent.onUserMessage("something the human typed");
	expect((await get(agent, "id1")).result.status.state).toBe("submitted");
	agent.onSettled(false); // the human's run settling must not complete the remote task
	expect((await get(agent, "id1")).result.status.state).toBe("submitted");
});

test("matching ignores surrounding whitespace and promotes each task once", async () => {
	const { agent } = make();
	await send(agent, "same");
	await send(agent, "same");
	agent.onUserMessage("  same\n");
	agent.onSettled(false);
	agent.onUserMessage("same");
	expect((await get(agent, "id1")).result.status.state).toBe("completed");
	expect((await get(agent, "id2")).result.status.state).toBe("working");
});

test("settle completes the working task with the last assistant text", async () => {
	const { agent } = make();
	await send(agent, "go");
	agent.onUserMessage("go");
	agent.onAssistantText("working on it");
	agent.onAssistantText("final answer");
	agent.onAssistantText(""); // a tool-call-only message must not erase the answer
	agent.onSettled(false);
	const t = (await get(agent, "id1")).result;
	expect(t.status.state).toBe("completed");
	expect(t.artifacts[0].parts[0].text).toBe("final answer");
});

test("follow-ups sharing one run: the next task's message completes the previous with ITS reply", async () => {
	const { agent } = make();
	await send(agent, "one");
	await send(agent, "two");
	agent.onUserMessage("one");
	agent.onAssistantText("ans1");
	agent.onUserMessage("two");
	expect((await get(agent, "id1")).result.artifacts[0].parts[0].text).toBe("ans1");
	expect((await get(agent, "id1")).result.status.state).toBe("completed");
	expect((await get(agent, "id2")).result.status.state).toBe("working");
	agent.onAssistantText("ans2");
	agent.onSettled(false);
	expect((await get(agent, "id2")).result.artifacts[0].parts[0].text).toBe("ans2");
});

test("a reply is never carried over to the next task", async () => {
	const { agent } = make();
	await send(agent, "one");
	await send(agent, "two");
	agent.onUserMessage("one");
	agent.onAssistantText("ans1");
	agent.onSettled(false);
	agent.onUserMessage("two");
	agent.onSettled(false); // no assistant text this time
	expect((await get(agent, "id2")).result.artifacts[0].parts[0].text).toBe("");
});

test("aborted settle fails the working task with a clear message", async () => {
	const { agent } = make();
	await send(agent, "go");
	agent.onUserMessage("go");
	agent.onSettled(true);
	const t = (await get(agent, "id1")).result;
	expect(t.status.state).toBe("failed");
	expect(t.status.message.parts[0].text).toMatch(/abort/i);
});

test("input-required survives until resolved, then the settle still completes it", async () => {
	const { agent } = make();
	await send(agent, "go");
	agent.onUserMessage("go");
	agent.onInputRequired("which?");
	agent.onInputResolved();
	agent.onAssistantText("done");
	agent.onSettled(false);
	expect((await get(agent, "id1")).result.status.state).toBe("completed");
});

test("an asynchronous delivery failure fails the task", async () => {
	const { agent } = make({ deliver: () => Promise.reject(new Error("boom")) });
	await send(agent, "x");
	await new Promise((r) => setTimeout(r, 0));
	const t = (await get(agent, "id1")).result;
	expect(t.status.state).toBe("failed");
	expect(t.status.message.parts[0].text).toContain("boom");
});

test("a synchronous delivery failure still fails the task immediately", async () => {
	const { agent } = make({ deliver: () => { throw new Error("sync boom"); } });
	const r = await send(agent, "x");
	expect(r.result.status.state).toBe("failed");
});
