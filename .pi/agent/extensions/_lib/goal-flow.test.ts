// Run: bun test ~/.pi/agent/extensions/_lib/goal-flow.test.ts
// The /goal command flows against a real git repo in a temp dir, with an injected store, clock, UI and agent channel.
// Scenario names refer to docs/specs/agentic-coding/features/goal-contract.feature.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { branchState, loadGoal, readRecordedHash, saveGoal, type Exec } from "./goal-io.ts";
import { checkHash } from "./goal.ts";
import { unlockGoal, parseGoalArgs, runGoalCommand, dropCurrentGoal, doneGoal, lockGoal, promptReminder, proposeFromAgent, showGoal, staleWarning, startGoal, type Deps } from "./goal-flow.ts";

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
// A killed or timed-out check reports code 0 in pi's exec; it must never read as green.
const killedBash: Exec = async (cmd, args, o) => (cmd === "bash" ? { code: 0, stdout: "", stderr: "", killed: true } : exec(cmd, args, o));
const refTip = () => git("for-each-ref", "--format=%(objectname)", "refs/goals/feat-export");
const refLog = () => git("log", "--format=%s", "refs/goals/feat-export").split("\n");
const editLockedCheck = (commandsList: string[]) => {
	const g = loadGoal(store, "feat/export")!;
	saveGoal(store, { ...g, doneCheck: { ...g.doneCheck, commands: commandsList } });
};
const events = (): any[] => {
	try { return readFileSync(join(store, "trajectories.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; }
};
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
test("done on a green check closes as check and only closes: no /persist, no agent turn, a notice lists the follow-ups", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	toAgent.length = 0;
	commands.length = 0;
	await doneGoal(d);
	const g = loadGoal(store, "feat/export")!;
	expect(g).toMatchObject({ status: "closed", closedBy: "check", closedAt: "2026-11-01T10:00:00Z" });
	expect(commands).toEqual([]);
	expect(toAgent).toEqual([]);
	expect(lastNote()).toMatch(/\/persist/);
	expect(lastNote()).toMatch(/lessons/i);
	expect(lastNote()).toMatch(/\/goal\b.*next goal/s);
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
	expect(commands).toEqual([]);
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

test("/goal x then /goal drop on an empty draft succeeds: a draft with no done-check can be dropped", async () => {
	const d = deps();
	await startGoal(d, "Users can export a backlog as CSV");
	await dropCurrentGoal(d, "dropped by the user");
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "dropped", doneCheck: { commands: [] } });
	expect(lastNote()).toMatch(/dropped/);
});

test("the /goal command reports an error thrown by a flow handler instead of throwing", async () => {
	const d = deps();
	await startGoal(d, "x");
	mkdirSync(join(store, "goals", "feat-export.md.tmp")); // saveGoal's temp file path is taken: the write throws
	await runGoalCommand(d, "drop");
	expect(notes.at(-1)).toMatch(/^\/goal drop failed: /);
});

test("drop marks the goal dropped", async () => {
	const d = await activeGoal();
	await dropCurrentGoal(d, "abandoned");
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "dropped" });
});

test("show prints the contract summary of a locked goal", async () => {
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
	expect(lastNote()).toMatch(/feat\/x/);
	expect(promptReminder(dash)).toBeUndefined();
	await startGoal(dash, "dash outcome");
	expect(lastNote()).toMatch(/feat\/x/);
	expect(readFileSync(file, "utf8")).toBe(before);
	await dropCurrentGoal(dash, "x");
	expect(readFileSync(file, "utf8")).toBe(before);
	expect(loadGoal(store, "feat/x")!.outcome).toBe("slash outcome");
});

// P1: approving a change is held to the same fail-on-base rule as lock.
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
	expect(r.message).toMatch(/\/goal unlock/);
	expect(loadGoal(store, "feat/export")).toEqual(before);
});

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

// Scenario: A Weakening Change needs the goal id typed
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

// Scenario: A locked Done-check edited outside /goal blocks closure
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

test("close and drop each write a tombstone commit on the ref: status closed|dropped and no check hash", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	await doneGoal(d);
	expect(refLog()[0]).toBe("closed g-feat-export");
	expect(git("show", "refs/goals/feat-export:status")).toBe("closed");
	expect(git("ls-tree", "--name-only", "refs/goals/feat-export")).toBe("status");
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "tombstone", status: "closed" });
	await startGoal(d, "again");
	await dropCurrentGoal(d, "abandoned"); // an empty draft: dropping still tombstones
	expect(git("show", "refs/goals/feat-export:status")).toBe("dropped");
	expect(git("ls-tree", "--name-only", "refs/goals/feat-export")).toBe("status");
	expect(refLog().slice(0, 2)).toEqual(["dropped g-feat-export", "closed g-feat-export"]);
});

test("close and drop save nothing when the tombstone cannot be written", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	const noRef: Exec = (cmd, args, o) => (cmd === "bash" && args[1].includes("commit-tree") ? Promise.resolve({ code: 1, stdout: "", stderr: "boom" }) : exec(cmd, args, o));
	await doneGoal({ ...d, exec: noRef });
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/boom/);
	await dropCurrentGoal({ ...d, exec: noRef }, "x");
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/boom/);
});

// ---- Events (ADR-009 Amendment 1) ----

test("refused or declined transitions append no event", async () => {
	const d = await draftWithCheck(["true"]);
	answers.push(true);
	await lockGoal(d); // passes on base: refused
	answers.push(false);
	await doneGoal(d); // not active
	expect(events()).toEqual([]);
	const a = await activeGoal();
	notes.length = 0;
	await doneGoal(a); // red check
	expect(events()).toHaveLength(1);
});


// ---- protocol: /goal | lock | unlock | done | drop | help ----

test("parseGoalArgs: unlock and help are subcommands; retired verbs are flagged, not taken as outcomes", () => {
	expect(parseGoalArgs("unlock")).toEqual({ kind: "unlock" });
	expect(parseGoalArgs("help")).toEqual({ kind: "help" });
	for (const w of ["check", "approve", "reject"]) expect(parseGoalArgs(w)).toEqual({ kind: "retired", word: w });
	expect(parseGoalArgs("check the csv export")).toEqual({ kind: "start", outcome: "check the csv export" });
});

test("a retired verb tells the human what to use instead", async () => {
	await runGoalCommand(deps(), "approve");
	expect(lastNote()).toMatch(/\/goal unlock/);
});

test("bare /goal with no goal drafts one from the conversation: a draft is saved and the agent is asked to discover and fill it", async () => {
	const d = deps();
	await runGoalCommand(d, "");
	const g = loadGoal(store, "feat/export")!;
	expect(g.status).toBe("draft");
	expect(toAgent.join("\n")).toMatch(/from the conversation/);
	expect(toAgent.join("\n")).toMatch(/outcome/);
	// the agent can then set the outcome through goal_propose
	const r = await proposeFromAgent(d, { outcome: "Users can export a backlog as CSV", doneCheck: { kind: "command", commands: ["test -f export.csv"] } });
	expect(r.ok).toBe(true);
	expect(loadGoal(store, "feat/export")!.outcome).toBe("Users can export a backlog as CSV");
});

test("bare /goal on a closed goal shows it, saves a fresh draft and asks the agent to infer the next goal from the discussion", async () => {
	await draftWithCheck();
	saveGoal(store, { ...loadGoal(store, "feat/export")!, status: "closed" });
	await runGoalCommand(deps(), "");
	expect(notes.join("\n")).toMatch(/closed/);
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "draft" });
	expect(toAgent.join("\n")).toMatch(/next goal/i);
	expect(toAgent.join("\n")).toMatch(/discussion|conversation/);
	expect(toAgent.join("\n")).toContain("Users can export");
});

test("a draft that follows a finished goal logs goal_started with the id it came from; a first draft logs nothing", async () => {
	await draftWithCheck();
	expect(events()).toEqual([]);
	saveGoal(store, { ...loadGoal(store, "feat/export")!, status: "closed" });
	await runGoalCommand(deps(), "");
	expect(events()).toMatchObject([{ event: "goal_started", goal: "g-feat-export", from: "g-feat-export", previousStatus: "closed" }]);
	saveGoal(store, { ...loadGoal(store, "feat/export")!, status: "dropped" });
	await startGoal(deps(), "third");
	expect(events().map((e) => e.previousStatus)).toEqual(["closed", "dropped"]);
	await proposeFromAgent(deps(), { doneCheck: { kind: "command", commands: ["test -f x"] } });
	saveGoal(store, { ...loadGoal(store, "feat/export")!, status: "closed" });
	await proposeFromAgent(deps(), { outcome: "fourth", doneCheck: { kind: "command", commands: ["test -f y"] } });
	expect(events().map((e) => e.previousStatus)).toEqual(["closed", "dropped", "closed"]);
});

test("goal_propose on a closed goal starts a new draft instead of refusing; it is not locked", async () => {
	await draftWithCheck();
	saveGoal(store, { ...loadGoal(store, "feat/export")!, status: "closed" });
	const r = await proposeFromAgent(deps(), { outcome: "Export is also available as JSON", doneCheck: { kind: "command", commands: ["test -f export.json"] } });
	expect(r.ok).toBe(true);
	expect(loadGoal(store, "feat/export")).toMatchObject({ status: "draft", outcome: "Export is also available as JSON" });
});

test("parseGoalArgs: close is an alias of done, not an outcome", () => {
	expect(parseGoalArgs("close")).toEqual({ kind: "done" });
});

test("bare /goal on a draft shows the card with a next-step line", async () => {
	const d = await draftWithCheck();
	await runGoalCommand(d, "");
	expect(lastNote()).toMatch(/Done-check/);
	expect(lastNote()).toMatch(/Next: \/goal lock/);
});

test("bare /goal on a locked goal shows the card and whether the check is green or red", async () => {
	const d = await activeGoal();
	await runGoalCommand(d, "");
	expect(notes.join("\n")).toMatch(/Done-check red/);
	expect(lastNote()).toMatch(/Next: do the work/);
	commitFile("export.csv");
	await runGoalCommand(deps(), "");
	expect(notes.join("\n")).toMatch(/Done-check green/);
	expect(lastNote()).toMatch(/Next: \/goal done/);
});

test("goal_propose on a locked goal is refused and points at /goal unlock", async () => {
	const d = await activeGoal();
	const r = await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["true"] }, reason: "flaky" });
	expect(r.ok).toBe(false);
	expect(r.message).toMatch(/\/goal unlock/);
	expect(loadGoal(store, "feat/export")!.pending).toBeUndefined();
});

test("unlock turns a locked goal back into a draft, logs it, and lets the agent edit again", async () => {
	const d = await activeGoal();
	answers.push(true);
	await unlockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(events().map((e) => e.event)).toEqual(["goal_locked", "goal_unlocked"]);
	const r = await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f more.csv"] } });
	expect(r.ok).toBe(true);
});

test("unlock then relock with an unchanged or stronger check asks only yes/no and records a new hash", async () => {
	const d = await activeGoal();
	answers.push(true);
	await unlockGoal(d);
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f more.csv"] } });
	inputs.length = 0;
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(inputs).toEqual([]);
	expect(events().map((e) => e.event)).toEqual(["goal_locked", "goal_unlocked", "goal_locked"]);
});

test("relock of a weakened check needs the goal id typed; a wrong id leaves the draft", async () => {
	const d = await activeGoal();
	answers.push(true);
	await unlockGoal(d);
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f other.csv"] } });
	typed.push("nope");
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("draft");
	expect(inputs.join("\n")).toMatch(/WEAKEN/);
	typed.push("g-feat-export");
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
});

test("unlock only applies to a locked goal", async () => {
	const d = await draftWithCheck();
	await unlockGoal(d);
	expect(lastNote()).toMatch(/Only a locked goal/);
});

test("a refusal names the next step for the state the goal is in", async () => {
	const note = async (status: string, run: (d: Deps) => Promise<void>) => {
		await draftWithCheck();
		saveGoal(store, { ...loadGoal(store, "feat/export")!, status: status as any });
		notes.length = 0;
		await run(deps());
		return lastNote();
	};
	for (const s of ["closed", "dropped"]) {
		expect(await note(s, doneGoal)).toMatch(/finished.*Run \/goal/s);
		expect(await note(s, unlockGoal)).toMatch(/finished.*Run \/goal/s);
		expect(await note(s, lockGoal)).toMatch(/finished.*Run \/goal/s);
		expect(await note(s, (d) => dropCurrentGoal(d, "x"))).toMatch(/finished.*Run \/goal/s);
	}
	expect(await note("draft", doneGoal)).toMatch(/\/goal lock/);
	expect(await note("draft", unlockGoal)).toMatch(/\/goal lock/);
	expect(await note("active", lockGoal)).toMatch(/\/goal done|\/goal unlock/);
});

test("/goal <outcome> over a live goal names both ways out", async () => {
	await draftWithCheck();
	await startGoal(deps(), "another");
	expect(lastNote()).toMatch(/\/goal drop/);
	expect(lastNote()).toMatch(/\/goal lock|\/goal done/);
});

test("/goal help hands the man page to the UI", async () => {
	let shown = "";
	await runGoalCommand({ ...deps(), showHelp: (t: string) => { shown = t; } }, "help");
	expect(shown).toMatch(/^# GOAL\(1\)/m);
});

// ---- ADR-010 integrity, unchanged by the simplification ----

test("done refuses when the goal file's check differs from the ref tip; the goal stays active and nothing runs", async () => {
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
	await showGoal(d);
	expect(lastNote()).toMatch(/differs from the approved one/);
	expect(lastNote()).not.toMatch(/Done-check (green|red)/);
});

test("done refuses an active goal that has no ref", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	git("update-ref", "-d", "refs/goals/feat-export");
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/no approved record|no record/i);
});

test("a hand-made active file cannot match an old hash once the ref tip is a tombstone, and a fresh lock works again", async () => {
	const d = await activeGoal();
	const closedFile = loadGoal(store, "feat/export")!;
	commitFile("export.csv");
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("closed");
	saveGoal(store, { ...closedFile, status: "active" });
	notes.length = 0; commands.length = 0;
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
	expect(lastNote()).toMatch(/closed|tombstone/i);
	expect(commands).toEqual([]);
	await dropCurrentGoal(d, "forged");
	await startGoal(d, "again");
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f later.csv"] } });
	answers.push(true);
	await lockGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("active");
});

test("unlock and relock move the ref: the relocked check is the one that closes", async () => {
	const d = await activeGoal();
	answers.push(true);
	await unlockGoal(d);
	await proposeFromAgent(d, { doneCheck: { kind: "command", commands: ["test -f export.csv", "test -f more.csv"] } });
	answers.push(true);
	await lockGoal(d);
	expect(refLog()).toEqual(["lock g-feat-export", "lock g-feat-export"]);
	commitFile("export.csv"); commitFile("more.csv");
	await doneGoal(d);
	expect(loadGoal(store, "feat/export")!.status).toBe("closed");
});

test("lock records the check hash on the ref; a declined lock records nothing", async () => {
	const d = await draftWithCheck();
	answers.push(false);
	await lockGoal(d);
	expect(refTip()).toBe("");
	answers.push(true);
	await lockGoal(d);
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "hash", hash: checkHash(loadGoal(store, "feat/export")!.doneCheck) });
	expect(git("status", "--porcelain")).toBe("");
});

test("close writes a tombstone on the ref", async () => {
	const d = await activeGoal();
	commitFile("export.csv");
	await doneGoal(d);
	expect(refLog()[0]).toBe("closed g-feat-export");
});

test("lock, unlock, relock and close each append exactly one event", async () => {
	const d = await activeGoal();
	answers.push(true);
	await unlockGoal(d);
	answers.push(true);
	await lockGoal(d);
	commitFile("export.csv");
	await doneGoal(d);
	expect(events().map((e) => e.event)).toEqual(["goal_locked", "goal_unlocked", "goal_locked", "goal_closed"]);
});
