/**
 * How /goal lock asks for the Outcome Check. The human almost always takes the default, so the dialog only
 * asks when the choice is truly ambiguous, and never shows a command longer than one short line.
 * Labels are display only: the plan always carries the verbatim command that is run and stored.
 */

export const LABEL_MAX = 80;
export const MAX_CHOICES = 3;

export type LockPlan =
	| { mode: "confirm"; default: string; label: string }
	| { mode: "pick"; options: { label: string; command: string }[] };

/** One line of at most `max` chars; long commands keep their head and tail around an ellipsis. */
export function shorten(command: string, max = LABEL_MAX): string {
	const one = command.replace(/\s+/g, " ").trim();
	if (one.length <= max) return one;
	const keep = max - 1;
	const head = Math.ceil(keep / 2);
	return `${one.slice(0, head)}…${one.slice(one.length - (keep - head))}`;
}

/** Test runners prove behaviour; file and grep probes only prove shape. Lower rank sorts first. */
function rank(command: string): number {
	if (/^(?:timeout\s+\S+\s+)?(?:bun test|make test|uv run pytest|pytest|npm test|go test|cargo test|just test)\b/.test(command)) return 0;
	if (/^(?:test|\[|rg|grep|!)\s/.test(command)) return 2;
	return 1;
}

/** Labels that stay unique: a clash is resolved by numbering the later ones. */
function labelled(commands: string[]): { label: string; command: string }[] {
	const seen = new Set<string>();
	return commands.map((command, i) => {
		let label = shorten(command);
		if (seen.has(label)) label = shorten(command, LABEL_MAX - 4).replace(/$/, ` (${i + 1})`);
		seen.add(label);
		return { label, command };
	});
}

/**
 * Confirm when the default is clear: one command, or exactly one agent suggestion that is one of the commands.
 * Otherwise pick from at most 3: the suggestions in their order, else the commands ranked test-runners first.
 */
export function lockPlan(check: { commands: string[]; outcomeChecks?: string[] }): LockPlan {
	const commands = check.commands;
	const suggested = (check.outcomeChecks ?? []).filter((c) => commands.includes(c));
	const sole = commands.length === 1 ? commands[0] : suggested.length === 1 ? suggested[0] : undefined;
	if (sole !== undefined) return { mode: "confirm", default: sole, label: shorten(sole) };
	const pool = suggested.length
		? suggested
		: commands.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
	return { mode: "pick", options: labelled(pool.slice(0, MAX_CHOICES)) };
}
