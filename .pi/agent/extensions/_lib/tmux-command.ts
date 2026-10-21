// Pure helpers for /tmux [W.P] <prompt>. Tested in tmux-command.test.ts.
// The command never touches tmux itself: it hands the prompt to the CURRENT agent,
// which loads tmux-remote-control and drives the target pane with that skill's scripts.

export interface TmuxArgs { target?: string; prompt: string }

// First token only: "1.1" or "session:1.1". Digits.digits later in the prompt are plain text.
const TARGET = /^((?:[A-Za-z0-9_-]+:)?\d+\.\d+)(?=\s|$)/;

export function parseTmuxArgs(raw: string): TmuxArgs {
	const s = raw.trim();
	const m = TARGET.exec(s);
	if (!m) return { prompt: s };
	return { target: m[1], prompt: s.slice(m[0].length).trim() };
}

const RULES =
	"Rules: operate on the target pane only through the skill's scripts (tmux-list/read/exec); " +
	"never target your own pane; stay in the current session unless the target names one; " +
	"do not send C-c or kill anything unless asked; report what you saw or did.";

export function buildTmuxMessage({ target, prompt }: TmuxArgs, opts: { remembered?: boolean } = {}): string {
	const head = "/skill:tmux-remote-control ";
	if (!target) {
		return `${head}No target pane given: run tmux-list.sh, pick the pane that fits the request, say which you chose.\nRequest: ${prompt}\n${RULES}`;
	}
	const task = prompt || "Read the pane (read-only, e.g. tmux-read.sh -n 40) and summarise what is happening in it.";
	const note = opts.remembered ? "remembered from the user's last /tmux; current session unless qualified" : "current session unless qualified";
	return `${head}Target pane: ${target} (${note}).\nRequest: ${task}\n${RULES}`;
}
