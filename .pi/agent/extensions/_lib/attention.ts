/**
 * Attention data structures, formatting for tmux status-right badge, and switcher list helpers.
 */

export interface AttnPane {
	session: string;
	window: string;
	pane: string;
	reason: string;
}

/**
 * Format badge for tmux status-right.
 * Uses palette: #ff6633 warm orange, clean unicode glyph ●.
 * Silent (empty string) when no panes require attention.
 */
export function formatAttnBadge(panes: AttnPane[]): string {
	if (panes.length === 0) return "";
	const first = panes[0];
	const loc = `${first.session}:${first.window}.${first.pane}`;
	if (panes.length === 1) {
		return `#[fg=#ff6633]● ${loc}#[default]`;
	}
	return `#[fg=#ff6633]● [${panes.length}] ${loc}#[default]`;
}

/**
 * Parse lines formatted as "#{session_name}|#{window_index}|#{pane_index}|#{@pi_attn}"
 * Returning only panes where @pi_attn is set and non-empty.
 */
export function parseAttnPanes(raw: string): AttnPane[] {
	const lines = raw.split("\n");
	const result: AttnPane[] = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const parts = trimmed.split("|");
		if (parts.length >= 4) {
			const [session, window, pane, ...rest] = parts;
			const reason = rest.join("|").trim();
			if (reason) {
				result.push({ session, window, pane, reason });
			}
		}
	}
	return result;
}
