/**
 * Antigravity Prompt Shim
 *
 * Works around Google's backend false-rejecting pi's default system prompt
 * opener on Antigravity (generic 429 "Resource has been exhausted", not a real
 * quota wall). Rewrites the opener on the final provider payload, so it
 * survives pi-antigravity upgrades and is a no-op once upstream fixes it.
 *
 * Kill switch: PI_AG_SHIM=0. Retire when pi-antigravity ships PR #147.
 * Core logic and tests: _lib/antigravity-prompt-shim.ts
 *
 * Load location: ~/.pi/agent/extensions/antigravity-prompt-shim.ts (global)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isFalse429, rewriteAntigravityPayload } from "./_lib/antigravity-prompt-shim.ts";

export default function (pi: ExtensionAPI) {
	const enabled = process.env.PI_AG_SHIM !== "0";
	let warned = false;

	pi.on("before_provider_request", (event) => {
		if (!enabled) return undefined;
		return rewriteAntigravityPayload(event.payload);
	});

	// Canary: when the backend rule moves again the first sign is this error.
	pi.on("message_end", (event, ctx) => {
		const m = event.message as { stopReason?: string; errorMessage?: string } | undefined;
		if (warned || m?.stopReason !== "error" || !isFalse429(m.errorMessage)) return;
		warned = true;
		if (ctx.hasUI) {
			ctx.ui.notify(
				"Antigravity 'Resource has been exhausted' is often a prompt-opener false 429, not quota. " +
					"See antigravity-prompt-shim.ts (PI_AG_SHIM=0 toggles it) and pi-antigravity issue #137.",
				"warning",
			);
		}
	});
}
