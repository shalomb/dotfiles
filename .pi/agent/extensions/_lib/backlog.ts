/**
 * Pure helpers for backlog awareness in pi (backlog-command.ts). Tested in backlog.test.ts.
 * The backlog itself is owned by the todo-navigator CLI (`todo brief|claim|done`).
 */

export interface Brief {
	todo: string;
	open: number;
	mine: { id: string; title: string }[];
	claimed: { id: string; owner: string; since: string }[];
	next: { id: string; title: string; priority: string } | null;
}

export const ownerFor = (sessionId: string): string => `pi:${sessionId.slice(0, 8)}`;

/** After a commit, a reminder for the agent to close or release what it holds. Never touches git. */
export function commitNudge(mine: { id: string; title: string }[], sha: string): string | undefined {
	if (!mine.length) return undefined;
	const lines = mine.map((m) => `- ${m.id} (${m.title}): if commit ${sha} meets its acceptance criteria, run \`todo done ${m.id} --commit ${sha}\`; if you are stopping, \`todo release ${m.id}\`; otherwise keep going.`);
	return [`Commit ${sha} landed while you hold backlog tasks:`, ...lines].join("\n");
}

/** True if a shell command line runs `git [opts] commit` (not commit-tree, not a grep for "commit"). */
export function isGitCommit(command: string): boolean {
	return command
		.split(/&&|\|\||;|\|/)
		.some((seg) => /^\s*(?:\w+=\S*\s+)*git(?:\s+-[A-Za-z]\s+\S+|\s+--\S+)*\s+commit(?:\s|$)/.test(seg));
}

/** System-prompt section text, or undefined when there is no backlog. */
export function backlogSection(b: Brief | null, owner: string): string | undefined {
	if (!b) return undefined;
	const mine = b.mine.map((m) => `${m.id} (${m.title})`).join(", ") || "nothing";
	const others = b.claimed.map((c) => `${c.id} by ${c.owner}`).join(", ") || "none";
	const next = b.next ? `${b.next.id} (${b.next.title}, ${b.next.priority})` : "none (all blocked or claimed)";
	return [
		`Backlog ${b.todo}: ${b.open} open. You (TODO_OWNER=${owner}) hold: ${mine}. Claimed by others: ${others}. Next ready: ${next}.`,
		"If the user's request matches an open task, `todo claim <id>` before starting; for \"next\"/\"go\" run `todo claim`. Never work a task claimed by someone else.",
		"After the commit that meets the card's acceptance criteria run `todo done <id> --commit HEAD`; if you stop early, `todo release <id>`. Backlog ids are private bookkeeping: keep them out of commit messages, branch names and PRs. Do not tick TODO.md checkboxes by hand.",
	].join("\n");
}
