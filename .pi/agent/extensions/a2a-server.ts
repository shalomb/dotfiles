/**
 * a2a-server — expose this pi session as a loopback A2A agent (opt-in: PI_A2A=1).
 * Remote tasks arrive as follow-up user messages; task state follows pi's run events,
 * including input-required while a UI dialog blocks on a human. Logic + tests:
 * _lib/a2a-agent.ts, _lib/a2a-http.ts, _lib/a2a-wire.ts (+ .test.ts).
 *
 * Handshake (interim, until the ADR-013 registry exists):
 *   $XDG_RUNTIME_DIR/pi/a2a/<sessionId>.a2a.json   {sessionId,pid,url,token,cwd,tmuxPane}, 0600 in a 0700 dir
 * Binds 127.0.0.1 only; every RPC needs the bearer token from that file.
 *
 * Load location: ~/.pi/agent/extensions/a2a-server.ts (global)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { wireA2A } from "./_lib/a2a-wire.ts";

export default function (pi: ExtensionAPI) {
	if (process.env.PI_A2A !== "1") return;
	const base = process.env.XDG_RUNTIME_DIR && process.env.XDG_RUNTIME_DIR.startsWith("/")
		? process.env.XDG_RUNTIME_DIR
		: `/tmp/pi-runtime-${process.getuid?.() ?? "u"}`;
	wireA2A(pi, { stateDir: join(base, "pi", "a2a") });
}
