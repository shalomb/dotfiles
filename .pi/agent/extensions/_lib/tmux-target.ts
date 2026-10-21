// Remember the last /tmux target per caller, on disk. Tested in tmux-target.test.ts.
//
// Key    : tmux server pid + the caller's pane id (e.g. tmux-64523-2) -> unique per pane, survives
//          /compact, /new and pi restarts, cannot collide after a tmux server restart. Outside tmux: session id.
// Storage: one JSON file per key under $XDG_STATE_HOME/pi/tmux-targets/ (no shared file, so no write races).
// Stable : the pane id (%17) is saved next to the typed W.P and re-resolved on every reuse, because
//          window/pane indexes shift when windows close.

import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { buildTmuxMessage, parseTmuxArgs } from "./tmux-command.ts";

export interface Saved { target: string; paneId?: string; savedAt: number }
export interface Deps {
	exec(args: string[]): Promise<{ code: number; stdout: string }>; // runs `tmux <args>`
	load(): Saved | undefined;
	save(s: Saved): void;
	ownPane?: string; // $TMUX_PANE of this agent
	now?: () => number;
}
export type Plan = { kind: "send"; message: string } | { kind: "error" | "info"; text: string };

const MAX_AGE_MS = 30 * 86400_000;
const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "");

export function callerKey(env: Record<string, string | undefined>, sessionId: string): string {
	const pane = /^%(\d+)$/.exec(env.TMUX_PANE ?? "")?.[1];
	const server = /,(\d+),\d+$/.exec(env.TMUX ?? "")?.[1];
	return pane && server ? `tmux-${server}-${pane}` : `session-${safe(sessionId) || "unknown"}`;
}

export function storeDir(env: Record<string, string | undefined>, home: string): string {
	const xdg = env.XDG_STATE_HOME;
	return join(xdg && isAbsolute(xdg) ? xdg : join(home, ".local", "state"), "pi", "tmux-targets");
}

export function loadTarget(dir: string, key: string): Saved | undefined {
	try {
		const j = JSON.parse(readFileSync(join(dir, `${safe(key)}.json`), "utf8"));
		if (typeof j?.target !== "string" || !j.target) return undefined;
		return { target: j.target, paneId: typeof j.paneId === "string" ? j.paneId : undefined, savedAt: Number(j.savedAt) || 0 };
	} catch {
		return undefined;
	}
}

export function saveTarget(dir: string, key: string, s: Saved): void {
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${safe(key)}.json`);
	const tmp = `${file}.${process.pid}.tmp`;
	writeFileSync(tmp, JSON.stringify(s) + "\n");
	renameSync(tmp, file); // atomic: readers never see a half-written file
	const cutoff = Date.now() - MAX_AGE_MS;
	for (const f of readdirSync(dir)) {
		if (!f.endsWith(".json")) continue;
		try { if (statSync(join(dir, f)).mtimeMs < cutoff) unlinkSync(join(dir, f)); } catch {}
	}
}

interface PaneInfo { paneId: string; session: string; local: string }

async function resolvePane(exec: Deps["exec"], target: string): Promise<PaneInfo | undefined> {
	const r = await exec(["display", "-p", "-t", target, "#{pane_id}\t#{session_name}\t#{window_index}.#{pane_index}"]).catch(() => undefined);
	if (!r || r.code !== 0) return undefined;
	const [paneId, session, local] = r.stdout.trim().split("\t");
	return paneId && session && local ? { paneId, session, local } : undefined;
}

const USAGE = "usage: /tmux [window.pane] <what to do>   e.g. /tmux 1.1 run the tests";

export async function planTmux(raw: string, d: Deps): Promise<Plan> {
	const parsed = parseTmuxArgs(raw);
	const saved = d.load();
	const now = d.now ?? Date.now;
	const own = (id: string) => !!d.ownPane && id === d.ownPane;

	if (!parsed.target && !parsed.prompt) {
		return { kind: "info", text: `${USAGE}${saved ? `\ncurrent target: ${saved.target}` : "\nno target remembered yet"}` };
	}

	if (parsed.target) {
		const info = await resolvePane(d.exec, parsed.target);
		if (!info) return { kind: "error", text: `/tmux: no such pane "${parsed.target}" (is pi running inside tmux?)` };
		if (own(info.paneId)) return { kind: "error", text: `/tmux: ${parsed.target} is this agent's own pane` };
		d.save({ target: parsed.target, paneId: info.paneId, savedAt: now() });
		return { kind: "send", message: buildTmuxMessage(parsed) };
	}

	if (!saved) return { kind: "send", message: buildTmuxMessage(parsed) };

	let target = saved.target;
	if (saved.paneId) {
		const info = await resolvePane(d.exec, saved.paneId);
		if (!info) return { kind: "error", text: `/tmux: remembered pane ${saved.target} no longer exists. Pick one with /tmux <window.pane> <prompt>` };
		if (own(info.paneId)) return { kind: "error", text: `/tmux: remembered pane ${saved.target} is this agent's own pane` };
		const caller = (await d.exec(["display", "-p", "#{session_name}"]).catch(() => undefined))?.stdout.trim();
		target = caller && caller === info.session ? info.local : `${info.session}:${info.local}`;
		if (target !== saved.target) d.save({ target, paneId: info.paneId, savedAt: now() });
	}
	return { kind: "send", message: buildTmuxMessage({ target, prompt: parsed.prompt }, { remembered: true }) };
}
