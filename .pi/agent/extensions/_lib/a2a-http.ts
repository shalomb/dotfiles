/**
 * Loopback-only HTTP transport for an A2AAgent. Tested in a2a-http.test.ts.
 *   GET  /.well-known/agent-card.json   public (name/skills only)
 *   POST /  and  POST /rpc              JSON-RPC, requires `Authorization: Bearer <token>`
 * Binds 127.0.0.1 on an ephemeral port; refuses non-loopback peers; 64 KiB body cap.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import type { A2AAgent } from "./a2a-agent.ts";

export interface ServerOpts { token: string; port?: number; maxBody?: number }
export interface Running { url: string; port: number; close(): Promise<void> }

const digest = (s: string) => createHash("sha256").update(s).digest();
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function tokenOk(header: string | undefined, token: string): boolean {
	const given = /^Bearer (.+)$/.exec(header ?? "")?.[1] ?? "";
	return timingSafeEqual(digest(given), digest(token)) && given.length > 0; // compare digests: constant time, equal length
}

function json(res: ServerResponse, status: number, body: unknown) {
	const s = JSON.stringify(body);
	res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(s), "cache-control": "no-store" });
	res.end(s);
}

function readBody(req: IncomingMessage, max: number): Promise<string | "too-large"> {
	return new Promise((resolve, reject) => {
		let size = 0; const chunks: Buffer[] = [];
		req.on("data", (c: Buffer) => {
			size += c.length;
			if (size > max) { if (chunks.length) chunks.length = 0; resolve("too-large"); req.resume(); return; } // drain, don't destroy: the client still gets its 413
			if (size <= max) chunks.push(c);
		});
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}

export async function startA2AServer(agent: A2AAgent, opts: ServerOpts): Promise<Running> {
	const max = opts.maxBody ?? 64 * 1024;
	const server = createServer(async (req, res) => {
		try {
			if (!LOOPBACK.has(req.socket.remoteAddress ?? "")) return json(res, 403, { error: "loopback only" });
			const path = (req.url ?? "/").split("?")[0];
			if (req.method === "GET" && path === "/.well-known/agent-card.json") return json(res, 200, agent.card());
			if (path !== "/" && path !== "/rpc") return json(res, 404, { error: "not found" });
			if (req.method !== "POST") return json(res, 405, { error: "POST only" });
			if (!tokenOk(req.headers.authorization, opts.token)) return json(res, 401, { error: "unauthorized" });
			const raw = await readBody(req, max);
			if (raw === "too-large") { res.setHeader("connection", "close"); return json(res, 413, { error: "payload too large" }); }
			let body: unknown;
			try { body = JSON.parse(raw); } catch { return json(res, 200, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }); }
			return json(res, 200, await agent.handleRpc(body));
		} catch (e) {
			if (!res.headersSent) json(res, 500, { error: "internal error" });
		}
	});
	await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(opts.port ?? 0, "127.0.0.1", resolve); });
	const addr = server.address();
	const port = typeof addr === "object" && addr ? addr.port : 0;
	const url = `http://127.0.0.1:${port}`;
	agent.setUrl(url);
	return { url, port, close: () => new Promise<void>((r) => { server.close(() => r()); server.closeAllConnections?.(); }) };
}
