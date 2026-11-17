/**
 * Block message for modern-cli-guard (tested in modern-cli-message.test.ts). Kept to two short lines:
 * it is paid on every block. Must say that NOTHING ran (a block aborts the whole compound command) and
 * which segment tripped it.
 */
export function blockReason(o: { cmd: string; tokens: string[]; hint: string; fix?: string | null; hasBody: boolean; skillInstruction: string }): string {
	const seg = o.tokens.join(" ");
	const shown = seg.length > 160 ? `${seg.slice(0, 160)}…` : seg;
	const lead = `WARNING: NOT RUN. \`${o.cmd}\` is disallowed (modern-cli-overrides)`;
	const first = o.fix ? `${lead}.\nRun exactly this instead: ${o.fix}\n` : `${lead}; use ${o.hint}.\n`;
	return (
		first +
		`Segment: ${shown}. Nothing in the command ran; fix it and resubmit the whole command.` +
		(o.hasBody ? "" : `\n${o.skillInstruction}`)
	);
}
