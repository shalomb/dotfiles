/**
 * Filesystem Scan Guard
 *
 * Blocks filesystem-scanning commands (fd, rg, find, grep -r, ls -R, du)
 * from being rooted too high — / or broad system directories are
 * wasteful and can be extremely slow on this VM (network mounts, huge
 * trees, /proc, /sys). This is independent of *which* binary is used
 * (see modern-cli-guard.ts): fd and rg are just as capable of scanning
 * all of / as find and grep are.
 *
 * Policy (guidance, not security): only RECURSIVE scans (fd, find, rg, du, tree,
 * grep -r, ls -R) of broad roots (/, /usr, /var, /etc, ...) are blocked.
 * Targeted subpaths and plain ls/grep are allowed. /tmp and $TMPDIR always allowed.
 * Logic lives in ./_lib/scan-policy.ts.
 *
 * Commands are found with the shared quote-aware splitter
 * (./_lib/shell-segments.ts), so a `|` inside a quoted regex does not hide
 * the real path argument and commands on later lines are not missed.
 *
 * Load location: ~/.pi/agent/extensions/filesystem-scan-guard.ts (global, every project)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { checkScan } from "./_lib/scan-policy.ts";

export default function (pi: ExtensionAPI) {
	const home = process.env.HOME ?? "";

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;
		const input = event.input as { command?: string; cwd?: string };
		const command = String(input.command ?? "");
		if (!command.trim()) return undefined;

		const reason = checkScan(command, String(input.cwd ?? process.cwd()), home);
		if (!reason) return undefined;
		if (ctx.hasUI) ctx.ui.notify(reason, "warning");
		return { block: true, reason };
	});
}
