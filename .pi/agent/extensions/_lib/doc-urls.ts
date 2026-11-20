/**
 * Report-server URLs for files under ~/.cache/agent-skills (port of serve-artefacts urls.py).
 * Reads the running nginx config, starts nothing, refuses anything outside the
 * served root, behind a dot segment, or reached through a symlink.
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export interface Endpoint {
	net: string;
	host: string;
	port: string;
}

export const SERVED_ROOT = join(homedir(), ".cache", "agent-skills");
export const SYSTEM_CONF = "/etc/nginx/conf.d/agent-skills.conf";

export function relUnderRoot(path: string, root = SERVED_ROOT): string | null {
	const raw = resolve(path.replace(/^~(?=\/|$)/, homedir()));
	if (!existsSync(raw)) return null;
	const rel = relative(root, raw);
	if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
	let cur = root;
	for (const seg of rel.split(sep)) {
		cur = join(cur, seg);
		if (seg.startsWith(".") || lstatSync(cur).isSymbolicLink()) return null;
	}
	return rel + (statSync(raw).isDirectory() ? "/" : "");
}

export function buildUrls(rel: string, eps: Endpoint[]): { net: string; url: string }[] {
	return eps.map(({ net, host, port }) => {
		const h = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
		return { net, url: `http://${h}${port === "80" ? "" : `:${port}`}/r/${rel}` };
	});
}

/** Synchronous best-effort probe: is something listening on 127.0.0.1:port? */
export function portAnswers(port: string): boolean {
	const p = Number(port);
	if (!Number.isInteger(p)) return false;
	const r = spawnSync("bash", ["-c", `exec 3<>/dev/tcp/127.0.0.1/${p}`], { stdio: "ignore", timeout: 1000 });
	return r.status === 0;
}

export function systemEndpoint(conf = SYSTEM_CONF, host = hostname(), probe: (p: string) => boolean = portAnswers): Endpoint[] {
	let t: string;
	try {
		t = readFileSync(conf, "utf8");
	} catch {
		return [];
	}
	const m = t.match(/^\s*listen\s+(\d+)\s+default_server;/m);
	if (!m || !t.includes("location /r/") || !probe(m[1])) return [];
	return [{ net: "url", host, port: m[1] }];
}

export function userEndpoints(runDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 0}`): Endpoint[] {
	const base = join(runDir, "agent-skills", "understand-server");
	if (!existsSync(base)) return [];
	const out: Endpoint[] = [];
	for (const net of readdirSync(base).sort()) {
		const conf = join(base, net, "nginx.conf");
		if (!existsSync(conf)) continue;
		const t = readFileSync(conf, "utf8");
		const m = t.match(/listen\s+([\w.:[\]]+):(\d+);/);
		if (m && t.includes("location /r/")) out.push({ net, host: m[1], port: m[2] });
	}
	return out;
}

export function endpoints(): Endpoint[] {
	const sys = systemEndpoint();
	return sys.length ? sys : userEndpoints();
}

/** URLs for a served path, or [] when it is not servable or no server runs. */
export function urlsFor(path: string, root = SERVED_ROOT, eps: Endpoint[] = endpoints()): { net: string; url: string }[] {
	const rel = relUnderRoot(path, root);
	return rel ? buildUrls(rel, eps) : [];
}
