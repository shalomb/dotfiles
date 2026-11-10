/**
 * Mirror the pi session name (/name, /rename, pi.setSessionName) onto the tmux
 * window and pane title of the pane pi runs in. No-op outside tmux.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function tmuxRenameArgs(pane: string, name: string | undefined): string[][] {
	if (!name) return [];
	return [
		["select-pane", "-t", pane, "-T", name],
		["rename-window", "-t", pane, name],
	];
}

export default function (pi: ExtensionAPI) {
	const pane = process.env.TMUX_PANE;
	if (!process.env.TMUX || !pane) return;
	const sync = async () => {
		for (const args of tmuxRenameArgs(pane, pi.getSessionName())) {
			await pi.exec("tmux", args).catch(() => {});
		}
	};
	pi.on("session_info_changed", sync);
	pi.on("session_start", sync);
}
