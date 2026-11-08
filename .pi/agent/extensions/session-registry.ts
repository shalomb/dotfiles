/**
 * Live session registry: tracks running pi sessions in SQLite (registerInstance, touchActivity, closeInstance, reapLost).
 * Events: session_start (registerInstance + reapLost), turn_end (touchActivity), session_shutdown (closeInstance).
 * DB at defaultDbPath() ONLY (never in repo). Wrapped in try/catch: registry failure must never break pi.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawnSync } from "node:child_process";
import { openRegistry, registerInstance, touchActivity, closeInstance, reapLost, defaultDbPath, deriveRepo, gitFacts } from "./_lib/registry.ts";

export default function (pi: ExtensionAPI) {
	let db: ReturnType<typeof openRegistry> | null = null;
	let sessionId = "";
	let pid = 0;

	const init = () => {
		if (!db) {
			try { db = openRegistry(defaultDbPath()); } catch (e) { console.error("[session-registry] init failed:", e); }
		}
	};

	pi.on("session_start", async (_e: any, ctx: any) => {
		try {
			init();
			if (!db) return;
			sessionId = ctx.sessionManager.getSessionId();
			pid = process.pid;
			const file = ctx.sessionManager.getSessionMetadataPath?.() ?? "";
			const cwd = ctx.cwd ?? process.cwd();
			const { worktree } = deriveRepo(cwd);
			const { branch } = gitFacts(cwd);
			const profile = ctx.profile?.name ?? null;
			const model = null;
			const started = new Date().toISOString();
			
			let tmuxSession: string | undefined, tmuxWindow: string | undefined, tmuxPane: string | undefined;
			const pane = process.env.TMUX_PANE;
			if (pane) {
				tmuxPane = pane;
				const s = spawnSync("tmux", ["display-message", "-p", "-t", pane, "#S"], { encoding: "utf8", timeout: 1000 });
				if (s.status === 0 && s.stdout.trim()) tmuxSession = s.stdout.trim();
				const w = spawnSync("tmux", ["display-message", "-p", "-t", pane, "#I"], { encoding: "utf8", timeout: 1000 });
				if (w.status === 0 && w.stdout.trim()) tmuxWindow = w.stdout.trim();
			}

			registerInstance(db, { sessionId, file, cwd, pid, tmuxSession, tmuxWindow, tmuxPane, worktree, branch, profile, model, started });
			reapLost(db);
		} catch (e) { console.error("[session-registry] session_start failed:", e); }
	});

	pi.on("turn_end", async (_e: any, _ctx: any) => {
		try {
			if (!db || !sessionId) return;
			touchActivity(db, sessionId, new Date().toISOString());
		} catch (e) { console.error("[session-registry] turn_end failed:", e); }
	});

	pi.on("session_shutdown", async (_e: any, _ctx: any) => {
		try {
			if (!db || !sessionId || !pid) return;
			closeInstance(db, sessionId, pid, new Date().toISOString());
		} catch (e) { console.error("[session-registry] session_shutdown failed:", e); }
	});
}
