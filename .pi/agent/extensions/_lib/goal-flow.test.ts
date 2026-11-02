// Run: bun test ~/.pi/agent/extensions/_lib/goal-flow.test.ts
// The /goal command flows against a real git repo in a temp dir, with an injected store, clock, UI and agent channel.
// Scenario names refer to docs/specs/agentic-coding/features/goal-contract.feature.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { branchState, loadGoal, readRecordedHash, saveGoal, type Exec } from "./goal-io.ts";
import { checkHash } from "./goal.ts";
import { approveChange, checkGoal, parseGoalArgs, dropCurrentGoal, doneGoal, lockGoal, promptReminder, proposeFromAgent, rejectChange, showGoal, staleWarning, startGoal, type Deps } from "./goal-flow.ts";

const exec: Exec = (cmd, args, o) =>
	new Promise((res) => execFile(cmd, args, { cwd: o?.cwd, timeout: o?.timeout }, (e: any, stdout, stderr) => res({ code: e ? (typeof e.code === "number" ? e.code : 1) : 0, stdout, stderr })));

let root: string;
let store: string;
let tmp: string;
let notes: string[];
let toAgent: string[];
let commands: string[];
let answers: boolean[];
let confirms: string[];
let selects: { title: string; options: string[] }[];
let typed: (string | undefined)[];
let inputs: string[];
/** What the human picks in a select: the option at this index, or nothing (a cancel). */
let pick: number | undefined;

const git = (...a: string[]) => execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
const commitFile = (name: string) => {
	writeFileSync(join(root, name), "x\n");
	git("add", name);
	git("commit", "-q", "-m", `add ${name}`);
};
const deps = (branch = "feat/export"): Deps => ({
	exec, store, root, branch, head: git("rev-parse", "--short", "HEAD"),
	now: () => new Date("2026-11-01T10:00:00Z"), tmpParent: tmp,
	ui: {
		notify: (m) => notes.push(m),
		confirm: async (title, message) => { confirms.push(`${title}\n${message}`); return answers.shift() ?? false; },
		select: async (title, options) => { selects.push({ title, options }); return pick === undefined ? undefined : options[pick]; },
		input: async (title, message) => { inputs.push(`${title}\n${message}`); return typed.shift(); },
	},
	tellAgent: (m) => toAgent.push(m),
	runCommand: (c) => commands.push(c),
});
const worktrees = () => git("worktree", "list", "--porcelain").match(/^worktree /gm)?.length;
const lastNote = () => notes.at(-1) ?? "";

/** A draft for feat/export whose check is `test -f export.csv`: red at base, green once the work exists. */
async function draftWithCheck(commandsList = ["test -f export.csv"]) {
	const d = deps();
	await startGoal(d, "Users can export a backlog as CSV");
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: commandsList } });
	return d;
}
async function activeGoal() {
	const d = await draftWithCheck();
	answers.push(true);
	await lockGoal(d);
	return d;
}

beforeEach(() => {
	root = realpathSync(mkdtempSync(join(tmpdir(), "goalflow-repo-")));
	store = realpathSync(mkdtempSync(join(tmpdir(), "goalflow-store-")));
	tmp = realpathSync(mkdtempSync(join(tmpdir(), "goalflow-tmp-")));
	execFileSync("git", ["init", "-q", "-b", "main", root]);
	commitFile("a.txt");
	git("switch", "-q", "-c", "feat/export");
	notes = []; toAgent = []; commands = []; answers = []; confirms = []; selects = []; typed = []; inputs = []; pick = 0;
});
afterEach(() => {
	for (const d of [root, store, tmp]) rmSync(d, { recursive: true, force: true });
});

test("/goal <outcome> saves a draft at HEAD and asks the agent to fill it through goal_propose, without locking", async () => {
	const d = deps();
	await startGoal(d, "Users can export a backlog as CSV");
	const g = loadGoal(store, "feat/export")!;
	expect(g).toMatchObject({ id: "g-feat-export", status: "draft", outcome: "Users can export a backlog as CSV" });
	expect(g.doneCheck.baseCommit).toBe(d.head);
	expect(g.doneCheck.lockedAt).toBe("");
	expect(toAgent.join("\n")).toMatch(/goal_propose/);
	expect(toAgent.join("\n")).toMatch(/fail on the base commit/);
});

test("/goal <outcome> refuses to replace a draft or active goal", async () => {
	await startGoal(deps(), "first");
	await startGoal(deps(), "second");
	expect(loadGoal(store, "feat/export")!.outcome).toBe("first");
	expect(lastNote()).toMatch(/\/goal drop/);
});

test("/goal <outcome> may replace a closed goal", async () => {
	expect(loadGoal(store, "feat/export")).toBeUndefined();
	await draftWithCheck();
	const saved = loadGoal(store, "feat/export")!;
	saveGoal(store, { ...saved, status: "closed" });
	await startGoal(deps(), "second");
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "draft", outcome: "second" });
});

test("detached HEAD has no goal: start explains instead of writing", async () => {
	const d = { ...deps(), branch: undefined };
	await startGoal(d, "x");
	expect(lastNote()).toMatch(/branch/);
});

// Scenario: A Done-check that already passes on the base commit is refused
test("lock refuses when the check passes on the base commit: nothing locked, the human is told it must fail first, no confirm is asked", async () => {
	const d = await draftWithCheck(["true"]);
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(lastNote()).toMatch(/must fail before the work starts/);
	expect(confirms).toEqual([]);
	expect(worktrees()).toBe(1);
});

// Scenario: A Done-check that fails on the base commit is locked
test("lock on a failing check asks the human, then locks with the base commit it failed on", async () => {
	const d = await draftWithCheck();
	answers.push(true);
	await lockGoal(d);
	const g = loadGoal(store, "feat/export")!;
	expect(confirms).toHaveLength(1);
	expect(confirms[0]).toContain("test -f export.csv");
	expect(g.status).toBe("active");
	expect(g.doneCheck).toMatchObject({ lockedBy: "human", lockedAt: "2026-11-01T10:00:00Z", baseCommit: d.head });
	expect(g.history[0].reason).toMatch(new RegExp(`base ${d.head} failed: exit 1`));
	expect(worktrees()).toBe(1);
});

test("lock stays a draft when the human declines", async () => {
	const d = await draftWithCheck();
	answers.push(false);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
});

test("the check runs at the base commit, not at HEAD: work done since then does not make it count as passing", async () => {
	const d = await draftWithCheck();
	commitFile("export.csv"); // HEAD now passes the check; base does not
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
});

test("lock refuses a draft with no done-check yet", async () => {
	await startGoal(deps(), "x");
	answers.push(true);
	await lockGoal(deps());
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(lastNote()).toMatch(/done-check/);
});

test("a human-confirm check locks on the human's confirmation alone", async () => {
	const d = deps("design/sync");
	await startGoal(d, "Sync design agreed");
	await proposeFromAgent(d, { doneCheck: { kind: "human", commands: [] } });
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "design/sync")!.status).toBe("active");
});

test("goal_propose on a draft fills fields and cannot lock", async () => {
	const d = deps();
	await startGoal(d, "o");
	const r = await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["make t"] }, antiGoals: ["no deps"], scopeAnchors: ["src/"], specLinks: ["spec.md"] });
	expect(r.ok).toBe(true);
	const g = loadGoal(store, "feat/export")!;
	expect(g).toMatchObject({ status: "draft", antiGoals: ["no deps"], scopeAnchors: ["src/"], specLinks: ["spec.md"] });
	expect(g.doneCheck).toMatchObject({ commands: ["make t"], lockedAt: "" });
});

test("goal_propose with no goal on the branch says so", async () => {
	const r = await proposeFromAgent(deps(), { antiGoals: ["x"] });
	expect(r.ok).toBe(false);
});

// Scenario: The Main Copilot proposes a change to a locked Done-check
test("goal_propose on an active goal parks a pending change; the locked check is unchanged and the human is told", async () => {
	const d = await activeGoal();
	const before = loadGoal(store, "feat/export")!;
	const r = await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["true"] }, reason: "the csv check is flaky" });
	expect(r.ok).toBe(true);
	const g = loadGoal(store, "feat/export")!;
	expect(g.doneCheck).toEqual(before.doneCheck);
	expect(g.pending).toMatchObject({ by: "agent", reason: "the csv check is flaky" });
	expect(lastNote()).toMatch(/\/goal approve/);
});

test("goal_propose on an active goal needs a reason, and a plain field edit is refused", async () => {
	const d = await activeGoal();
	expect((await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["true"] } })).ok).toBe(false);
	expect((await proposeFromAgent(d, { antiGoals: ["new anti-goal"] })).ok).toBe(false);
	expect(loadGoal(store, "feat/export")!.pending).toBeUndefined();
});

test("approve applies the pending change after the human confirms, and records who and why", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f other.csv"] }, reason: "renamed output" });
	typed.push("g-feat-export"); // replacing a command is a weakening change
	await approveChange(d);
	const g = loadGoal(store, "feat/export")!;
	expect(g.doneCheck.commands).toEqual(["test -f other.csv"]);
	expect(g.pending).toBeUndefined();
	expect(g.history.at(-1)).toMatchObject({ by: "human", reason: "renamed output", old: { commands: ["test -f export.csv"] }, new: { commands: ["test -f other.csv"] } });
});

test("approve leaves the check unchanged when the human declines; reject discards the proposal", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f other.csv"] }, reason: "renamed output" });
	typed.push(undefined);
	await approveChange(d);
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f export.csv"]);
	expect(loadGoal(store, "feat/export")!.pending).toBeDefined();
	await rejectChange(d);
	expect(loadGoal(store, "feat/export")!.pending).toBeUndefined();
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f export.csv"]);
});

test("approve with nothing pending says so", async () => {
	const d = await activeGoal();
	await approveChange(d);
	expect(lastNote()).toMatch(/No change is pending/);
});

test("check reports red then green as the work lands", async () => {
	const d = await activeGoal();
	await checkGoal(d);
	expect(lastNote()).toMatch(/red/i);
	commitFile("export.csv");
	await checkGoal(d);
	expect(lastNote()).toMatch(/green/i);
});

// Scenario: Closing a goal while its Done-check fails is refused
test("done refuses on a red check: the goal stays active and the output is offered as a pointer", async () => {
	const d = await activeGoal();
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/stays active/);
	expect(lastNote()).toMatch(/test -f export\.csv/);
	expect(commands).toEqual([]);
});

// Scenario: Closing a goal with a green Done-check records the hand-off
test("done on a green check closes as check, then runs /persist and asks the agent for lessons", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	await doneGoal(d);
	const g = loadGoal(store, "feat/export")!;
	expect(g).toMatchObject({ status: "closed", closedBy: "check", closedAt: "2026-11-01T10:00:00Z" });
	expect(commands).toHaveLength(1);
	expect(commands[0]).toMatch(/^\/persist .*g-feat-export/);
	expect(toAgent.join("\n")).toMatch(/lessons/i);
});

// Scenario: A design goal without a command check closes as an assertion
test("done on a human-confirm check closes as assertion after the human confirms", async () => {
	const d = deps("design/sync");
	await startGoal(d, "Sync design agreed");
	await proposeFromAgent(d, { doneCheck: { kind: "human", commands: [] } });
	answers.push(true); // lock
	await lockGoal(d);
	answers.push(true); // outcome met
	await doneGoal(d);
	expect(loadGoal(store, "design/sync")).toMatchObject({ status: "closed", closedBy: "assertion" });
	expect(commands).toHaveLength(1);
});

test("done on a human-confirm check stays active when the human does not confirm", async () => {
	const d = deps("design/sync");
	await startGoal(d, "Sync design agreed");
	await proposeFromAgent(d, { doneCheck: { kind: "human", commands: [] } });
	answers.push(true);
	await lockGoal(d);
	answers.push(false);
	await doneGoal(d);
	expect(loadGoal(store, "design/sync")!.status).toBe("active");
	expect(commands).toEqual([]);
});

test("drop marks the goal dropped", async () => {
	const d = await activeGoal();
	await dropCurrentGoal(d, "abandoned");
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "dropped" });
});

test("show prints the contract summary, or tells how to start", async () => {
	await showGoal(deps());
	expect(lastNote()).toMatch(/\/goal <outcome>/);
	const d = await activeGoal();
	await showGoal(d);
	expect(lastNote()).toContain("g-feat-export");
	expect(lastNote()).toContain("Users can export a backlog as CSV");
	expect(lastNote()).toContain("test -f export.csv");
	expect(lastNote()).toMatch(/active/);
});

// Contract: one-line reminder only for an active goal on the current branch
test("the prompt reminder is one line for an active goal, and absent for a draft, no goal, or another branch", async () => {
	expect(promptReminder(deps())).toBeUndefined();
	const draft = await draftWithCheck();
	expect(promptReminder(draft)).toBeUndefined();
	answers.push(true);
	await lockGoal(draft);
	expect(promptReminder(draft)).toBe("Goal: g-feat-export Users can export a backlog as CSV; run /goal to refresh");
	expect(promptReminder(deps("feat/other"))).toBeUndefined();
});

// Scenario: The goal of a merged branch is flagged at session start
test("session start asks the human to close or drop the goal of a merged branch, and says nothing for a live one", async () => {
	const d = await activeGoal();
	expect(await staleWarning(d)).toBeUndefined();
	commitFile("export.csv");
	git("switch", "-q", "main");
	git("merge", "-q", "--no-ff", "-m", "merge", "feat/export");
	const onMain = { ...d, root };
	const w = await staleWarning(onMain);
	expect(w).toMatch(/merged/);
	expect(w).toMatch(/close or drop/);
	expect(w).toContain("feat/export");
});

test("staleWarning scans the store, so a session on main still sees the goal of a deleted branch", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	git("switch", "-q", "main");
	git("merge", "-q", "--no-ff", "-m", "merge", "feat/export");
	git("branch", "-q", "-d", "feat/export");
	const w = await staleWarning({ ...d, branch: "main" });
	expect(w).toMatch(/deleted/);
	expect(w).toContain("g-feat-export");
	expect((await branchState(exec, root, "feat/export", d.head)).exists).toBe(false);
});

test("parseGoalArgs: bare subcommand words are subcommands, anything else is an outcome", () => {
	expect(parseGoalArgs("")).toEqual({ kind: "show" });
	expect(parseGoalArgs("  lock ")).toEqual({ kind: "lock" });
	for (const w of ["check", "approve", "reject", "done", "drop"]) expect(parseGoalArgs(w)).toEqual({ kind: w } as any);
	expect(parseGoalArgs("Users can export a backlog")).toEqual({ kind: "start", outcome: "Users can export a backlog" });
	// an outcome that merely begins with a subcommand word is still an outcome
	expect(parseGoalArgs("drop the legacy cache")).toEqual({ kind: "start", outcome: "drop the legacy cache" });
	expect(parseGoalArgs("done")).toEqual({ kind: "done" });
});

// A killed or timed-out check reports code 0 in pi's exec; it must never read as green.
const killedBash: Exec = async (cmd, args, o) => (cmd === "bash" ? { code: 0, stdout: "", stderr: "", killed: true } : exec(cmd, args, o));

test("done does not close on a killed check even though its exit code is 0", async () => {
	const d = await activeGoal();
	await doneGoal({ ...d, exec: killedBash });
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/killed|timed out/i);
	expect(commands).toEqual([]);
});

test("lock does not treat a killed check as 'failed on base'", async () => {
	const d = await draftWithCheck();
	answers.push(true);
	await lockGoal({ ...d, exec: killedBash });
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(lastNote()).toMatch(/could not be run|killed|timed out/i);
	expect(confirms).toEqual([]);
	expect(worktrees()).toBe(1);
});

// P1: a hostile reason must not make a locked goal unreadable (and so overwritable by /goal <outcome>).
test("a hostile proposal reason keeps the locked goal readable, so /goal <outcome> still refuses to replace it", async () => {
	const d = await activeGoal();
	const reason = 'x | old: null | new: {"a":1}';
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f other.csv"] }, reason });
	expect(loadGoal(store, "feat/export")!.pending).toMatchObject({ reason, new: { commands: ["test -f other.csv"] } });
	await startGoal(d, "second");
	const g = loadGoal(store, "feat/export")!;
	expect(g.status).toBe("active");
	expect(g.outcome).toBe("Users can export a backlog as CSV");
});

test("/goal <outcome> refuses to overwrite a goal file it cannot parse; other handlers report the error", async () => {
	const d = await activeGoal();
	const file = join(store, "goals", "feat-export.md");
	writeFileSync(file, "garbage\n");
	await startGoal(d, "second");
	expect(readFileSync(file, "utf8")).toBe("garbage\n");
	expect(lastNote()).toMatch(/cannot be parsed/);
	notes.length = 0;
	await showGoal(d);
	await doneGoal(d);
	expect(notes).toHaveLength(2);
	for (const n of notes) expect(n).toMatch(/cannot be parsed/);
	expect((await proposeFromAgent(d, { antiGoals: ["x"] })).message).toMatch(/cannot be parsed/);
	expect(promptReminder(d)).toBeUndefined();
});

// P1: feat/x and feat-x share the file feat-x.md.
test("a branch whose name collides with another branch's goal slug sees no goal and cannot overwrite it", async () => {
	const slash = deps("feat/x");
	await startGoal(slash, "slash outcome");
	const file = join(store, "goals", "feat-x.md");
	const before = readFileSync(file, "utf8");
	const dash = deps("feat-x");
	notes.length = 0;
	await showGoal(dash);
	expect(lastNote()).toMatch(/No goal for this branch/);
	expect(promptReminder(dash)).toBeUndefined();
	await startGoal(dash, "dash outcome");
	expect(lastNote()).toMatch(/feat\/x/);
	expect(readFileSync(file, "utf8")).toBe(before);
	await dropCurrentGoal(dash, "x");
	expect(readFileSync(file, "utf8")).toBe(before);
	expect(loadGoal(store, "feat/x")!.outcome).toBe("slash outcome");
});

// P1: approving a change is held to the same fail-on-base rule as lock.
test("approve refuses a new check that passes on the base commit: nothing changes, no confirm is asked", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["true"] }, reason: "weaker" });
	confirms.length = 0;
	answers.push(true);
	await approveChange(d);
	expect(confirms).toEqual([]);
	expect(lastNote()).toMatch(/must fail before the work starts/);
	const g = loadGoal(store, "feat/export")!;
	expect(g.doneCheck.commands).toEqual(["test -f export.csv"]);
	expect(g.pending).toBeDefined();
	expect(worktrees()).toBe(1);
});

test("approve refuses when the new check could not be run on the base commit (killed)", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f other.csv"] }, reason: "renamed" });
	confirms.length = 0;
	answers.push(true);
	await approveChange({ ...d, exec: killedBash });
	expect(confirms).toEqual([]);
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f export.csv"]);
});

test("approve shows the live current check, and refuses when the pending proposal was made against a different one", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f other.csv"] }, reason: "renamed" });
	inputs.length = 0;
	typed.push("g-feat-export");
	await approveChange(d);
	expect(inputs[0]).toContain("Current:\n  $ test -f export.csv");
	// A pending change whose old no longer matches the live check (the check moved on since the proposal).
	const g = loadGoal(store, "feat/export")!;
	saveGoal(store, { ...g, pending: { at: "2026-11-01T10:00:00Z", by: "agent", reason: "stale", old: { kind: "command", commands: ["test -f export.csv"] }, new: { kind: "command", commands: ["test -f third.csv"] } } });
	inputs.length = 0;
	typed.push("g-feat-export");
	await approveChange(d);
	expect(inputs).toEqual([]);
	expect(lastNote()).toMatch(/no longer matches|changed since/i);
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f other.csv"]);
});

test("approve labels a change that removes commands as WEAKENING in the prompt title, and an additive change not", async () => {
	const d = await draftWithCheck(["test -f export.csv", "test -f never.csv"]);
	answers.push(true);
	await lockGoal(d);
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f other.csv"] }, reason: "swap" });
	inputs.length = 0;
	typed.push(undefined);
	await approveChange(d);
	expect(inputs[0]).toMatch(/^[^\n]*WEAKENING/);
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f never.csv", "test -f more.csv"] }, reason: "stricter" });
	confirms.length = 0;
	answers.push(false);
	await approveChange(d);
	expect(confirms[0].split("\n")[0]).not.toMatch(/WEAKENING/);
});

// ---- Outcome Check (ADR-009 Amendment 1) ----

// Scenario: Locking needs an Outcome Check
test("lock asks the human which command is the Outcome Check and records the pick", async () => {
	const d = await draftWithCheck(["test -f never.csv", "test -f export.csv"]);
	pick = 1;
	answers.push(true);
	await lockGoal(d);
	expect(selects).toHaveLength(1);
	expect(selects[0].options).toEqual(["test -f never.csv", "test -f export.csv"]);
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "active", doneCheck: { outcomeChecks: ["test -f export.csv"] } });
});

test("lock without a human-marked Outcome Check leaves the draft unlocked and asks no confirm", async () => {
	const d = await draftWithCheck();
	pick = undefined;
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(lastNote()).toMatch(/Outcome Check/);
	expect(confirms).toEqual([]);
	expect(worktrees()).toBe(1);
});

test("an agent-suggested Outcome Check does not stand in for the human's mark", async () => {
	const d = await draftWithCheck(["test -f export.csv", "test -f never.csv"]);
	const r = await proposeFromAgent(d, { outcomeChecks: ["test -f never.csv"] });
	expect(r.ok).toBe(true);
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "draft", doneCheck: { outcomeChecks: ["test -f never.csv"] } });
	pick = undefined;
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	pick = 0;
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.doneCheck.outcomeChecks).toEqual(["test -f export.csv"]);
});

test("goal_propose cannot set the Outcome Check of an active goal", async () => {
	const d = await activeGoal();
	const before = loadGoal(store, "feat/export")!;
	const r = await proposeFromAgent(d, { outcomeChecks: ["test -f export.csv"], doneCheck: { kind: "command", commands: ["test -f export.csv", "true"] }, reason: "x" });
	expect(r.ok).toBe(false);
	expect(r.message).toMatch(/Outcome Check/);
	expect(loadGoal(store, "feat/export")).toEqual(before);
});

test("approve asks the human to mark an Outcome Check when the change drops every marked command, and refuses without one", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f other.csv"] }, reason: "renamed output" });
	selects.length = 0;
	pick = undefined;
	typed.push("g-feat-export");
	await approveChange(d);
	expect(selects).toHaveLength(1);
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f export.csv"]);
	pick = 0;
	typed.push("g-feat-export");
	await approveChange(d);
	expect(loadGoal(store, "feat/export")!.doneCheck).toMatchObject({ commands: ["test -f other.csv"], outcomeChecks: ["test -f other.csv"] });
});

test("approve of a change that keeps the marked command asks no select", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f more.csv"] }, reason: "stricter" });
	selects.length = 0;
	answers.push(true);
	await approveChange(d);
	expect(selects).toEqual([]);
	expect(loadGoal(store, "feat/export")!.doneCheck.outcomeChecks).toEqual(["test -f export.csv"]);
});

// ---- Environment failures (ADR-009 Amendment 1) ----

// Scenario: A base failure caused by the environment does not lock by default
test("lock refuses a base failure caused by the environment: nothing locked, no Outcome Check or confirm asked, until the human types the goal id", async () => {
	const d = await draftWithCheck(["definitely-not-a-command-xyz"]);
	typed.push("nope");
	answers.push(true);
	await lockGoal(d);
	expect(inputs).toHaveLength(1);
	expect(inputs[0]).toContain("g-feat-export");
	expect(inputs[0]).toMatch(/command not found/);
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(lastNote()).toMatch(/environment/i);
	expect(selects).toEqual([]);
	expect(confirms).toEqual([]);
	expect(worktrees()).toBe(1);
	typed.length = 0;
	await lockGoal(d); // human cancels the input
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
});

test("lock goes on past an environment failure only when the goal id is typed exactly", async () => {
	const d = await draftWithCheck(["definitely-not-a-command-xyz"]);
	typed.push("g-feat-export");
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "active", doneCheck: { outcomeChecks: ["definitely-not-a-command-xyz"] } });
});

test("an ordinary base failure asks no goal id at lock", async () => {
	const d = await draftWithCheck();
	answers.push(true);
	await lockGoal(d);
	expect(inputs).toEqual([]);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
});

test("approve refuses a new check whose base failure is environmental unless the goal id is typed", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["definitely-not-a-command-xyz", "test -f export.csv"] }, reason: "stricter" });
	typed.push("wrong");
	answers.push(true);
	confirms.length = 0;
	await approveChange(d);
	expect(inputs).toHaveLength(1);
	expect(confirms).toEqual([]);
	expect(lastNote()).toMatch(/environment/i);
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f export.csv"]);
	typed.push("g-feat-export");
	answers.push(true);
	await approveChange(d);
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["definitely-not-a-command-xyz", "test -f export.csv"]);
});

// ---- Typed weakening (ADR-009 Amendment 1) ----

// Scenario: A Weakening Change needs the goal id typed
test("a weakening change is approved only by typing the goal id; yes/no confirm is not asked and a wrong id leaves it pending", async () => {
	const d = await draftWithCheck(["test -f export.csv", "test -f never.csv"]);
	answers.push(true);
	await lockGoal(d);
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv"] }, reason: "drop the never check" });
	confirms.length = 0; inputs.length = 0;
	answers.push(true);
	typed.push("yes");
	await approveChange(d);
	expect(confirms).toEqual([]);
	expect(inputs).toHaveLength(1);
	expect(inputs[0]).toMatch(/WEAKENING/);
	expect(inputs[0]).toContain("g-feat-export");
	expect(inputs[0]).toContain("test -f never.csv");
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f export.csv", "test -f never.csv"]);
	expect(loadGoal(store, "feat/export")!.pending).toBeDefined();
	typed.push(undefined); // cancel
	await approveChange(d);
	expect(loadGoal(store, "feat/export")!.pending).toBeDefined();
	typed.push("g-feat-export");
	await approveChange(d);
	const g = loadGoal(store, "feat/export")!;
	expect(g.doneCheck.commands).toEqual(["test -f export.csv"]);
	expect(g.history.at(-1)).toMatchObject({ by: "human", reason: "drop the never check" });
});

test("a change that only adds a command stays yes/no, and a move to a human-confirm check is a weakening change", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f other.csv"] }, reason: "stricter" });
	inputs.length = 0; confirms.length = 0;
	answers.push(true);
	await approveChange(d);
	expect(inputs).toEqual([]);
	expect(confirms).toHaveLength(1);
	await proposeFromAgent(d, { doneCheck: { kind: "human", commands: [] }, reason: "no command fits" });
	answers.push(true);
	typed.push("no");
	await approveChange(d);
	expect(inputs).toHaveLength(1);
	expect(loadGoal(store, "feat/export")!.doneCheck.kind).toBe("command");
});

test("a strengthening change keeps the yes/no confirm and asks no goal id", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f more.csv"] }, reason: "stricter" });
	inputs.length = 0; confirms.length = 0;
	answers.push(true);
	await approveChange(d);
	expect(inputs).toEqual([]);
	expect(confirms).toHaveLength(1);
	expect(loadGoal(store, "feat/export")!.doneCheck.commands).toEqual(["test -f export.csv", "test -f more.csv"]);
});

// ---- Tamper evidence (ADR-010) ----

const refTip = () => git("for-each-ref", "--format=%(objectname)", "refs/goals/feat-export");
const refLog = () => git("log", "--format=%s", "refs/goals/feat-export").split("\n");
const editLockedCheck = (commandsList: string[]) => {
	const g = loadGoal(store, "feat/export")!;
	saveGoal(store, { ...g, doneCheck: { ...g.doneCheck, commands: commandsList } });
};

test("lock commits the hash of the approved check to refs/goals/<branch-slug>, leaving the working tree and index clean", async () => {
	const d = await activeGoal();
	const g = loadGoal(store, "feat/export")!;
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "hash", hash: checkHash(g.doneCheck) });
	expect(refLog()).toEqual(["lock g-feat-export"]);
	expect(git("status", "--porcelain=v1", "--untracked-files=all")).toBe("");
	expect(git("branch", "--list")).not.toMatch(/goals/);
	expect(d.head).toBeTruthy();
});

test("a declined lock records nothing; a draft has no ref", async () => {
	const d = await draftWithCheck();
	answers.push(false);
	await lockGoal(d);
	expect(refTip()).toBe("");
});

test("approve adds a commit with the new hash, so done passes on the approved check and refuses the old one", async () => {
	const d = await activeGoal();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f more.csv"] }, reason: "stricter" });
	answers.push(true);
	await approveChange(d);
	const g = loadGoal(store, "feat/export")!;
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "hash", hash: checkHash(g.doneCheck) });
	expect(refLog()).toEqual(["approve g-feat-export: stricter", "lock g-feat-export"]);
});

test("a change that is not approved leaves the ref where it was", async () => {
	const d = await activeGoal();
	const tip = refTip();
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f more.csv"] }, reason: "stricter" });
	answers.push(false);
	await approveChange(d);
	await rejectChange(d);
	expect(refTip()).toBe(tip);
});

// Scenario: A locked Done-check edited outside /goal blocks closure
test("done and check refuse when the goal file's check differs from the ref tip; the goal stays active and nothing runs", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	editLockedCheck(["true"]);
	notes.length = 0;
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/differs from the approved one/);
	expect(lastNote()).toContain("git log refs/goals/feat-export");
	expect(commands).toEqual([]);
	notes.length = 0;
	await checkGoal(d);
	expect(notes).toHaveLength(1);
	expect(lastNote()).toMatch(/differs from the approved one/);
	expect(lastNote()).not.toMatch(/green|red/i);
});

test("moving an Outcome Check mark outside /goal also blocks closure", async () => {
	const d = await draftWithCheck(["test -f export.csv", "test -f never.csv"]);
	answers.push(true);
	await lockGoal(d);
	commitFile("export.csv");
	const g = loadGoal(store, "feat/export")!;
	saveGoal(store, { ...g, doneCheck: { ...g.doneCheck, outcomeChecks: ["test -f never.csv"] } });
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/differs/);
});

test("done refuses an active goal that has no ref (deleted, or locked before refs existed)", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	git("update-ref", "-d", "refs/goals/feat-export");
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/no approved record|no record/i);
	await checkGoal(d);
	expect(lastNote()).toMatch(/no approved record|no record/i);
});

test("done on an untouched check still closes, and a human-confirm goal is verified the same way", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("closed");
	const h = deps("design/sync");
	await startGoal(h, "Sync design agreed");
	await proposeFromAgent(h, { doneCheck: { kind: "human", commands: [] } });
	answers.push(true);
	await lockGoal(h);
	const g = loadGoal(store, "design/sync")!;
	saveGoal(store, { ...g, doneCheck: { ...g.doneCheck, kind: "command", commands: ["true"] } });
	await doneGoal(h);
	expect(loadGoal(store, "design/sync")!.status).toBe("active");
});

test("lock does not lock when the ref cannot be written", async () => {
	const d = await draftWithCheck();
	const noRef: Exec = (cmd, args, o) => (cmd === "bash" && args[1].includes("commit-tree") ? Promise.resolve({ code: 1, stdout: "", stderr: "boom" }) : exec(cmd, args, o));
	answers.push(true);
	await lockGoal({ ...d, exec: noRef });
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(lastNote()).toMatch(/boom/);
});

test("the ref is shared by a linked worktree: lock in one checkout, done in the other", async () => {
	const d = await activeGoal();
	const linked = join(root, ".worktrees", "other");
	git("worktree", "add", "-q", "--detach", linked, "feat/export");
	writeFileSync(join(linked, "export.csv"), "x\n");
	await doneGoal({ ...d, root: linked });
	expect(loadGoal(store, "feat/export")!.status).toBe("closed");
});
