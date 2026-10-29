/**
 * Pure rendering for /help: categorised slash commands, skills (repo-local + global) and a
 * todo summary, as one ANSI-coloured text blob for $PAGER. Tested in help.test.ts.
 */
export interface Entry { name: string; description?: string; source?: string }
export type Rules = [category: string, pattern: RegExp][];
export interface HelpInput {
	builtins: Entry[];
	commands: Entry[];
	globalSkills: Entry[];
	repoSkills: Entry[];
	todo: string;
	cwd: string;
}

export const commandRules: Rules = [
	["Git & changes", /^(git|gb|diff|since|changes|commit|lazygit|forensics|review)$/],
	["Planning & backlog", /^(todo|backlog|next|prev|plan|replan|tickets|standup|jira|goal)$/],
	["Design & modelling", /^(adr|c4|domain|bdd|design-code|grill-me|wizard)$/],
	["Quality & debugging", /^(debug|doctor|trace|test-review|lessons|humanize)$/],
	["Sessions & environment", /^(sessions|persist|tmux|yazi|dash|status|codemap|skills:.*|help)$/],
];

export const skillRules: Rules = [
	["Testing & quality", /(test|tdd|verification|farley|review|debug|bdd|accordion)/],
	["Git & release", /(^git|commit|worktree|branch|release|squash|finishing|github|forensics)/],
	["Planning & process", /(plan|brainstorm|todo|iteration|ralph|lisa|marge|lovejoy|ticket|backlog|adr|architecture|domain|design|c4|socratic|wizard)/],
	["Delegation & agents", /(sub-?agent|agent|dispatch|mux|tmux)/],
	["Cloud & infra", /(aws|terraform|tfc|harness|actions|justfile|uv$|python)/],
	["Docs, web & comms", /(web|docx|pptx|mermaid|gmail|outlook|teams|signal|meeting|standup|status|jira|atlassian|obsidian|humanizer|asd|video|link|search|image)/],
	["Code exploration", /(codemap|ast-grep|lsp|codebase|modern-cli|macro)/],
	["Meta", /(skill|lesson|superpowers|pi-|composio)/],
];

export const categoryOf = (name: string, rules: Rules): string =>
	rules.find(([, re]) => re.test(name))?.[0] ?? "Other";

const ESC = "\x1b[";
const c = (code: string, s: string) => `${ESC}${code}m${s}${ESC}0m`;
export const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

const one = (s = "") => s.replace(/\s+/g, " ").trim();
const clip = (s: string, n = 110) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function table(items: Entry[], prefix: string, rules: Rules): string[] {
	if (!items.length) return ["  (none)", ""];
	const w = Math.min(28, Math.max(...items.map((i) => prefix.length + i.name.length)) + 2);
	const groups = new Map<string, Entry[]>();
	for (const it of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
		const k = categoryOf(it.name, rules);
		const g = groups.get(k) ?? [];
		g.push(it);
		groups.set(k, g);
	}
	const order = [...rules.map(([k]) => k), "Other"].filter((k) => groups.has(k));
	const out: string[] = [];
	for (const k of order) {
		const g = groups.get(k) ?? [];
		out.push(`  ${c("1;33", k)} ${c("2", `(${g.length})`)}`);
		for (const it of g) {
			const label = `${prefix}${it.name}`;
			out.push(`    ${c("36", label.padEnd(w))}${clip(one(it.description))}`);
		}
	}
	out.push("");
	return out;
}

const heading = (t: string) => [c("1;35", `━━ ${t} ${"━".repeat(Math.max(2, 72 - t.length))}`), ""];

export function renderHelp(i: HelpInput): string {
	const slash = i.commands.filter((x) => x.source !== "skill" && !x.name.startsWith("skill:"));
	const todo = i.todo.trim();
	return [
		c("1", "pi help") + c("2", "  — q quit · / search · space page"),
		"",
		...heading("Built-in commands"),
		...table(i.builtins, "/", [["Built-in", /./]]),
		...heading("Slash commands"),
		...table(slash, "/", commandRules),
		...heading("Skills — repo-local"),
		...table(i.repoSkills, "", skillRules),
		...heading("Skills — global"),
		...table(i.globalSkills, "", skillRules),
		c("2", "  load on demand: /skills:loader · invoke: /skill:<name>"),
		"",
		...heading(`Todo — ${i.cwd}`),
		todo ? todo : "  (no backlog for this directory)",
		"",
	].join("\n");
}
