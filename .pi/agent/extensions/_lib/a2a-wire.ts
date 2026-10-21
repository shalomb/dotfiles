/**
 * Wires one pi session to an A2A endpoint. Tested in a2a-wire.test.ts with a fake pi.
 *
 *   session_start    start a loopback A2A server, write <stateDir>/<sessionId>.a2a.json (0600, dir 0700)
 *   message_start    role=user       -> agent.onUserMessage (promotes the matching remote task)
 *   message_end      role=assistant  -> agent.onAssistantText
 *   agent_settled                    -> agent.onSettled(aborted)
 *   ui_prompt_start/end              -> input-required / back to working
 *   session_shutdown stop the server, remove the file (idempotent; also runs on /new, /resume, reload)
 *
 * The info file {sessionId, pid, url, token, cwd, tmuxPane} is the interim handshake until the
 * shared registry (ADR-013) exists; the token lives in it, so it is 0600 in a 0700 directory.
 */
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { A2AAgent } from "./a2a-agent.ts";
import { type Running, startA2AServer } from "./a2a-http.ts";

type Block = { type?: string; text?: string };
type Msg = { role?: string; content?: string | Block[] };

const textOf = (content: Msg["content"]): string =>
	typeof content === "string" ? content : (content ?? []).filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n");

/** Text of the last assistant message that has any text block (tool-call-only messages are skipped). */
export function lastAssistantText(messages: Msg[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (m?.role !== "assistant") continue;
		const t = textOf(m.content).trim();
		if (t) return t;
	}
	return "";
}

export interface WireOpts { stateDir: string; env?: Record<string, string | undefined> }

export function wireA2A(pi: any, opts: WireOpts) {
	let agent: A2AAgent | undefined;
	let server: Running | undefined;
	let infoPath: string | undefined;
	let ctxRef: any;

	async function start(ctx: any) {
		await stop();
		ctxRef = ctx;
		const sessionId = String(ctx.sessionManager.getSessionId());
		const token = randomBytes(24).toString("hex");
		agent = new A2AAgent(
			{
				deliver: (text) => pi.sendUserMessage(text, { deliverAs: "followUp" }),
				abort: () => ctxRef?.abort?.(),
			},
			{ name: `pi:${sessionId.slice(0, 8)}`, url: "" },
		);
		server = await startA2AServer(agent, { token });
		mkdirSync(opts.stateDir, { recursive: true, mode: 0o700 });
		chmodSync(opts.stateDir, 0o700);
		infoPath = join(opts.stateDir, `${sessionId.replace(/[^A-Za-z0-9_-]/g, "")}.a2a.json`);
		const info = { sessionId, pid: process.pid, url: server.url, token, cwd: ctx.cwd, tmuxPane: opts.env?.TMUX_PANE ?? process.env.TMUX_PANE ?? null, startedAt: new Date().toISOString() };
		const tmp = `${infoPath}.${process.pid}.tmp`;
		writeFileSync(tmp, JSON.stringify(info) + "\n", { mode: 0o600 });
		renameSync(tmp, infoPath);
	}

	async function stop() {
		const s = server, p = infoPath;
		server = undefined; infoPath = undefined; agent = undefined;
		if (p) rmSync(p, { force: true });
		if (s) await s.close();
	}

	pi.on("session_start", async (_e: unknown, ctx: any) => { await start(ctx); });
	pi.on("session_shutdown", async () => { await stop(); });
	pi.on("message_start", (e: { message?: Msg }) => { if (e.message?.role === "user") agent?.onUserMessage(textOf(e.message.content)); });
	pi.on("message_end", (e: { message?: Msg }) => { if (e.message?.role === "assistant") agent?.onAssistantText(textOf(e.message.content)); });
	pi.on("agent_settled", (e: { aborted?: boolean }) => { agent?.onSettled(e.aborted === true); });
	pi.on("ui_prompt_start", (e: { title?: string }) => { agent?.onInputRequired(e.title); });
	pi.on("ui_prompt_end", () => { agent?.onInputResolved(); });

	return { stop };
}
