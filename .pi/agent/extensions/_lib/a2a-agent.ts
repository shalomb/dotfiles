/**
 * A2A task core for ONE pi agent (pure; no I/O). Tested in a2a-agent.test.ts.
 *
 * Maps A2A tasks onto pi's run lifecycle. The host (extension) feeds it pi events.
 * Precise correlation (what the pi extension uses):
 *   onUserMessage(text)   `message_start` role=user  the submitted task whose text matches -> working
 *                         (a follow-up shares the current run, and a human prompt must not match);
 *                         if another task is working it completes first with the last reply
 *   onAssistantText(text) `message_end` role=assistant  remembers the latest non-empty reply
 *   onSettled(aborted)    `agent_settled`            working task -> completed | failed("aborted")
 *   onInputRequired(q) / onInputResolved()           `ui_prompt_start` / `ui_prompt_end`
 * Coarser alternative for hosts that cannot see messages: onRunStart() (promotes the oldest
 * submitted task) and onRunEnd({text|error}).
 * The host also supplies a Port to inject a message into the agent (pi.sendUserMessage as a
 * follow-up); deliver() may be async, and a rejection fails the task.
 *
 * Wire shape: A2A v0.3 / fasta2a (kind-discriminated parts, kebab-case states). Both method
 * spellings are accepted: message/send|SendMessage, tasks/get|GetTask, tasks/cancel|CancelTask.
 * Rule that keeps a human's own prompt from completing a remote task: a run end only completes
 * a task that was promoted to `working` by a run start.
 */
export type TaskState = "submitted" | "working" | "input-required" | "completed" | "failed" | "canceled";
export interface Port { deliver(text: string, taskId: string): void | Promise<void>; abort?(): void }
export interface Options {
	name: string; url: string; description?: string;
	blockTimeoutMs?: number; maxTasks?: number;
	now?: () => number; newId?: () => string;
}
interface Part { kind: "text"; text: string }
interface Message { kind: "message"; role: "agent"; messageId: string; parts: Part[] }
interface TaskRec {
	id: string; contextId: string; state: TaskState; stamp: number; text: string;
	message?: Message; reply?: string;
}
type Rpc = { jsonrpc: "2.0"; id: unknown; result?: unknown; error?: { code: number; message: string } };

const TERMINAL = new Set<TaskState>(["completed", "failed", "canceled"]);
const E = { parse: -32700, request: -32600, method: -32601, params: -32602, notFound: -32001, notCancelable: -32002 };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export class A2AAgent {
	private tasks = new Map<string, TaskRec>();
	private waiters = new Map<string, (() => void)[]>();
	private url: string;
	private replyBuf = "";
	constructor(private port: Port, private opts: Options) { this.url = opts.url; }

	setUrl(url: string) { this.url = url; }
	private now = () => (this.opts.now ?? Date.now)();
	private newId = () => (this.opts.newId ?? (() => globalThis.crypto.randomUUID()))();

	card() {
		return {
			protocolVersion: "0.3.0",
			name: this.opts.name,
			description: this.opts.description ?? "A pi coding agent reachable on this machine",
			url: this.url,
			version: "0.1.0",
			capabilities: { streaming: false, pushNotifications: false },
			defaultInputModes: ["text/plain"],
			defaultOutputModes: ["text/plain"],
			securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
			security: [{ bearer: [] }],
			skills: [{ id: "chat", name: "Work on a task", description: "Send a prompt to this agent and get its reply", tags: ["pi"] }],
		};
	}

	// ---- host events ----
	onRunStart() {
		const next = [...this.tasks.values()].find((t) => t.state === "submitted");
		if (next && !this.active()) this.set(next, "working");
	}
	onRunEnd(r: { text?: string; error?: string }) {
		const cur = this.active();
		if (!cur) return;
		if (r.error !== undefined) { cur.message = this.msg(r.error); this.set(cur, "failed"); }
		else { cur.reply = r.text ?? ""; this.set(cur, "completed"); }
		this.evict();
	}
	onUserMessage(text: string) {
		const want = text.trim();
		const next = [...this.tasks.values()].find((t) => t.state === "submitted" && t.text.trim() === want);
		if (!next) return;
		const cur = this.active();
		if (cur?.state === "input-required") return; // blocked on a human: nothing can start behind it
		if (cur) { cur.reply = this.replyBuf; this.set(cur, "completed"); }
		this.replyBuf = "";
		this.set(next, "working");
	}
	onAssistantText(text: string) { if (text.trim()) this.replyBuf = text; }
	onSettled(aborted: boolean) {
		const cur = this.active();
		if (cur) {
			if (aborted) { cur.message = this.msg("run aborted"); this.set(cur, "failed"); }
			else { cur.reply = this.replyBuf; this.set(cur, "completed"); }
			this.evict();
		}
		this.replyBuf = "";
	}
	onInputRequired(question?: string) {
		const cur = [...this.tasks.values()].find((t) => t.state === "working");
		if (!cur) return;
		cur.message = question ? this.msg(question) : undefined;
		this.set(cur, "input-required");
	}
	onInputResolved() {
		const cur = [...this.tasks.values()].find((t) => t.state === "input-required");
		if (cur) { cur.message = undefined; this.set(cur, "working"); }
	}

	// ---- JSON-RPC ----
	async handleRpc(body: unknown): Promise<Rpc> {
		if (!isObj(body) || body.jsonrpc !== "2.0" || typeof body.method !== "string") return this.err(isObj(body) ? body.id : null, E.request, "invalid request");
		const id = body.id ?? null;
		const params = isObj(body.params) ? body.params : {};
		switch (body.method) {
			case "message/send": case "SendMessage": return this.send(id, params);
			case "tasks/get": case "GetTask": return this.getTask(id, params);
			case "tasks/cancel": case "CancelTask": return this.cancel(id, params);
			default: return this.err(id, E.method, `method not found: ${body.method}`);
		}
	}

	private async send(id: unknown, p: Record<string, unknown>): Promise<Rpc> {
		const m = p.message;
		const parts = isObj(m) && Array.isArray(m.parts) ? m.parts : [];
		const text = parts.filter((x): x is Part => isObj(x) && x.kind === "text" && typeof x.text === "string").map((x) => x.text).join("\n");
		if (!text.trim()) return this.err(id, E.params, "message needs at least one non-empty text part");
		const taskId = this.newId();
		const ctx = isObj(m) && typeof m.contextId === "string" && m.contextId ? m.contextId : taskId; // default context = the task itself
		const t: TaskRec = { id: taskId, contextId: ctx, state: "submitted", stamp: this.now(), text };
		this.tasks.set(t.id, t); // registered BEFORE delivery: a run may start synchronously inside deliver()
		try {
			const r = this.port.deliver(text, t.id);
			if (r && typeof (r as Promise<void>).then === "function") (r as Promise<void>).then(undefined, (e: unknown) => this.failTask(t, e));
		} catch (e) { this.failTask(t, e); return this.ok(id, this.view(t)); }
		const blocking = isObj(p.configuration) && p.configuration.blocking === true;
		if (blocking) await this.waitSettled(t);
		return this.ok(id, this.view(t));
	}

	private getTask(id: unknown, p: Record<string, unknown>): Rpc {
		if (typeof p.id !== "string" || !p.id) return this.err(id, E.params, "id is required");
		const t = this.tasks.get(p.id);
		return t ? this.ok(id, this.view(t)) : this.err(id, E.notFound, "task not found");
	}

	private cancel(id: unknown, p: Record<string, unknown>): Rpc {
		if (typeof p.id !== "string" || !p.id) return this.err(id, E.params, "id is required");
		const t = this.tasks.get(p.id);
		if (!t) return this.err(id, E.notFound, "task not found");
		if (TERMINAL.has(t.state)) return this.err(id, E.notCancelable, `task is already ${t.state}`);
		const running = t.state === "working" || t.state === "input-required";
		this.set(t, "canceled");
		if (running) { try { this.port.abort?.(); } catch { /* best effort */ } }
		return this.ok(id, this.view(t));
	}

	// ---- internals ----
	private failTask(t: TaskRec, e: unknown) {
		if (TERMINAL.has(t.state)) return;
		t.message = this.msg(`delivery failed: ${e instanceof Error ? e.message : String(e)}`);
		this.set(t, "failed");
	}
	private active() { return [...this.tasks.values()].find((t) => t.state === "working" || t.state === "input-required"); }
	private set(t: TaskRec, s: TaskState) {
		t.state = s; t.stamp = this.now();
		for (const w of this.waiters.get(t.id) ?? []) w();
		if (TERMINAL.has(s)) this.waiters.delete(t.id);
	}
	private waitSettled(t: TaskRec): Promise<void> {
		if (TERMINAL.has(t.state) || t.state === "input-required") return Promise.resolve();
		return new Promise((resolve) => {
			const timer = setTimeout(done, this.opts.blockTimeoutMs ?? 120_000);
			function done() { clearTimeout(timer); resolve(); }
			const check = () => { if (TERMINAL.has(t.state) || t.state === "input-required") done(); else this.waiters.set(t.id, [...(this.waiters.get(t.id) ?? []), check]); };
			this.waiters.set(t.id, [...(this.waiters.get(t.id) ?? []), check]);
		});
	}
	private evict() {
		const max = this.opts.maxTasks ?? 200;
		const finished = [...this.tasks.values()].filter((t) => TERMINAL.has(t.state));
		for (const t of finished.slice(0, Math.max(0, finished.length - max))) this.tasks.delete(t.id);
	}
	private msg(text: string): Message { return { kind: "message", role: "agent", messageId: this.newId(), parts: [{ kind: "text", text }] }; }
	private view(t: TaskRec) {
		return {
			kind: "task", id: t.id, contextId: t.contextId,
			status: { state: t.state, timestamp: new Date(t.stamp).toISOString(), ...(t.message ? { message: t.message } : {}) },
			...(t.reply !== undefined ? { artifacts: [{ artifactId: `${t.id}-reply`, name: "reply", parts: [{ kind: "text", text: t.reply }] }] } : {}),
		};
	}
	private ok(id: unknown, result: unknown): Rpc { return { jsonrpc: "2.0", id, result }; }
	private err(id: unknown, code: number, message: string): Rpc { return { jsonrpc: "2.0", id, error: { code, message } }; }
}
