// Run: bun test ~/.pi/agent/extensions/_lib/a2a-http.test.ts
import { afterEach, expect, test } from "bun:test";
import { A2AAgent } from "./a2a-agent";
import { startA2AServer } from "./a2a-http";

const TOKEN = "s3cret-token";
let closers: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(closers.map((c) => c())); closers = []; });

async function boot(deliver: (t: string) => void = () => {}) {
	const agent = new A2AAgent({ deliver }, { name: "t", url: "", blockTimeoutMs: 2000 });
	const srv = await startA2AServer(agent, { token: TOKEN });
	closers.push(srv.close);
	return { agent, srv };
}
// token: a string is sent as-is; null sends no Authorization header (undefined would trigger the default and send the valid one).
const rpc = (url: string, body: unknown, token: string | null = TOKEN) =>
	fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("binds to loopback only, on an ephemeral port, and tells the agent its url", async () => {
	const { agent, srv } = await boot();
	expect(srv.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
	expect((agent.card() as any).url).toBe(srv.url);
});

test("agent card is served without auth at /.well-known/agent-card.json", async () => {
	const { srv } = await boot();
	const r = await fetch(`${srv.url}/.well-known/agent-card.json`);
	expect(r.status).toBe(200);
	expect(((await r.json()) as any).name).toBe("t");
});

test("rpc requires the bearer token: missing or wrong -> 401 and nothing is delivered", async () => {
	const seen: string[] = [];
	const { srv } = await boot((t) => seen.push(t));
	const body = { jsonrpc: "2.0", id: 1, method: "message/send", params: { message: { role: "user", parts: [{ kind: "text", text: "pwn" }] } } };
	expect((await rpc(srv.url, body, null)).status).toBe(401);
	expect((await rpc(srv.url, body, "wrong")).status).toBe(401);
	expect((await rpc(srv.url, body, TOKEN + "x")).status).toBe(401);
	expect(seen).toEqual([]);
	expect((await rpc(srv.url, body)).status).toBe(200);
	expect(seen).toEqual(["pwn"]);
});

test("both POST / and POST /rpc work; other methods and paths are refused", async () => {
	const { srv } = await boot();
	const body = { jsonrpc: "2.0", id: 1, method: "tasks/get", params: { id: "x" } };
	expect((await rpc(srv.url + "/", body)).status).toBe(200);
	expect((await rpc(srv.url + "/rpc", body)).status).toBe(200);
	expect((await fetch(srv.url + "/rpc")).status).toBe(405);
	expect((await rpc(srv.url + "/elsewhere", body)).status).toBe(404);
});

test("malformed or oversized bodies get JSON-RPC / HTTP errors, not crashes", async () => {
	const { srv } = await boot();
	const bad = await rpc(srv.url, "{not json");
	expect(((await bad.json()) as any).error.code).toBe(-32700);
	const big = await rpc(srv.url, JSON.stringify({ pad: "x".repeat(70_000) }));
	expect(big.status).toBe(413);
	expect((await rpc(srv.url, { jsonrpc: "2.0", id: 1, method: "tasks/get", params: { id: "x" } })).status).toBe(200);
});

test("end to end over HTTP: blocking send returns the reply once the run ends", async () => {
	const { agent, srv } = await boot(() => { setTimeout(() => agent.onRunStart(), 5); setTimeout(() => agent.onRunEnd({ text: "pong" }), 30); });
	const r = await rpc(srv.url, { jsonrpc: "2.0", id: 1, method: "message/send", params: { message: { role: "user", parts: [{ kind: "text", text: "ping" }] }, configuration: { blocking: true } } });
	const j: any = await r.json();
	expect(j.result.status.state).toBe("completed");
	expect(j.result.artifacts[0].parts[0].text).toBe("pong");
});

test("close() stops listening", async () => {
	const { srv } = await boot();
	await srv.close();
	closers = [];
	await expect(fetch(`${srv.url}/.well-known/agent-card.json`)).rejects.toBeTruthy();
});
