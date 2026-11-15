/**
 * uv Guard
 *
 * Blocks pip/pip3/pipx/poetry/virtualenv and `python -m pip|venv|py_compile` (also via explicit
 * interpreter paths like .venv/bin/python and `sh -c '...'`), telling the agent the exact uv
 * replacement and why. Never rewrites silently: the agent must learn the guardrail and work within it.
 * Policy lives in ./_lib/uv-policy.ts (unit-tested).
 *
 * Load location: ~/.pi/agent/extensions/uv-guard.ts (global, every project)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { logGuardEvent } from "./_lib/guard-log.ts";
import { uvBlockReason, uvViolation } from "./_lib/uv-policy.ts";

const GUIDANCE =
	"Python tooling is uv-only. Never type: pip/pip3/pipx/poetry/virtualenv or `python -m pip|venv|py_compile`.\n" +
	"- add dependency: `uv add PKG`; one-off: `uv run --with PKG python x.py`\n" +
	"- venv: `uv venv`; run: `uv run CMD`; tools: `uvx TOOL`\n" +
	"- syntax check: `uv run python -m ast f.py >/dev/null` (py_compile writes __pycache__)";

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event) => {
		logGuardEvent({ guard: "uv", kind: "prompt", sections: ["uv_guardrails"] });
		event.systemPromptOptions.sections = { ...event.systemPromptOptions.sections, uv_guardrails: GUIDANCE };
		return undefined;
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;
		const command = String((event.input as { command?: string }).command ?? "");
		if (!command.trim()) return undefined;
		const v = uvViolation(command);
		if (!v) return undefined;
		const reason = uvBlockReason(v);
		logGuardEvent({ guard: "uv", kind: "block", rule: v.rule, command: v.segment, fix: v.use });
		if (ctx.hasUI) ctx.ui.notify(reason, "warning");
		return { block: true, reason };
	});
}
