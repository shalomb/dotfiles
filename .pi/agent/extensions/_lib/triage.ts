/** Pure prompt builder for /triage. Gathering context and the command live in triage-command.ts. */
export interface TriageCtx { cwd: string; branch: string; brief: string; subject: string }

export function triagePrompt(c: TriageCtx): string {
	const input = c.subject.trim()
		? `Input to triage: ${c.subject.trim()}`
		: "Input to triage: the most recent artifact in this conversation (a file read, report, plan or list). Name it in one line.";
	return `Triage the input below against the todo backlog. Read-only until I confirm.

${input}

Context
- Worktree: ${c.cwd}   Branch: ${c.branch}
- ${c.brief}

Steps
1. Split the input into discrete items (keep the input's own numbering).
2. For each item search the backlog: \`todo list <query>\`, \`todo view <id>\`; also \`rg\` the repo and docs/architecture for ADRs or goals that already cover it. Cards claimed by others are untouchable: mark them.
3. Give each item exactly one disposition:
   - \`dup\`: a card exists; name it and what evidence to append
   - \`new\`: draft a card (title, priority P0-P3, deps, --scope paths, acceptance criteria, the proof: failing test / characterisation test / dry-run)
   - \`merge\`: fold into another item's card
   - \`upstream\`: belongs in another repo; draft an issue/card text there
   - \`defer\` / \`drop\`: say why
   - \`goal\`: spans several tasks; suggest I run /goal (do not start one)
4. Print one table (item, disposition, target, priority, note), conflicts, and a suggested order. Be concise.
5. End by asking: create the cards? Do not run \`todo add\`, \`todo dep\`, \`todo edit\` or any write until I answer yes. After yes, use \`todo add --prio --depends --scope\`; never claim, never hand-edit TODO.md, keep card ids out of commit messages.`;
}
