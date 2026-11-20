/** The /goal man page (one popup page). Tested in goal-help.test.ts: every subcommand must appear here. */
const STATES = `## Goal states
\`\`\`
           /goal [outcome]         /goal lock             /goal done
   none ───────────────────▶ draft ─────────────▶ locked ───────────────▶ closed
                               ▲  ◀───────────────  │                        │
                               │    /goal unlock                            │
                               │                                            │
                               └──── /goal  (drafts the next goal) ◀────────┘

   draft | locked ── /goal drop ──▶ dropped ── /goal (drafts the next goal) ──▶ draft
\`\`\`

`;

export const GOAL_HELP = STATES + `# GOAL(1)
## NAME
goal - one checkable goal per branch, locked before work starts
## SYNOPSIS
\`/goal [<outcome>] | lock | unlock | done | drop | check | help\`
## COMMANDS
- **/goal** - No goal: agent drafts one from context. Draft: show card. Locked: card + check; when green, offers to close. Closed/dropped: drafts the next goal from the discussion
- **\`/goal <outcome>\`** - Same as /goal, seeding the outcome
- **/goal lock** - One dialog: pick the Outcome Check (agent's suggestion first) to lock. Refuses if the check already passes on the base commit
- **/goal unlock** - Locked -> draft, to correct it. Logged; relock re-validates
- **/goal done** - Run the check; close if green, then suggest /persist, lessons and the next goal (alias: /goal close)
- **/goal check** - Run the locked goal's done_check commands (only those in the contract), time-boxed, and show PASS/FAIL per command. Changes nothing
- **/goal drop** - Abandon the goal (removes its drive checkpoint)
- **\`/goal drop <id>\`** - Drop a live goal of any branch, e.g. one whose branch was deleted (asks first)
- **\`/goal drive [scenic|motorway] [extra]\`** - Hand the locked goal to the drive skill (alias: /drive). Refuses unless locked and intact; resumes from a checkpoint only if it names this goal and lock
- **\`/goal show <id>\`** - Show any goal by id, current or archived
- **/goal help** - This page
## DESCRIPTION
- **States** - none -> draft -> locked -> closed (or dropped); see the diagram above
- **Draft** - Agent fills outcome, done-check, anti-goals, scope anchors, spec links via goal_propose. Only here
- **Id** - Names the goal: \`g-<kr>-<outcome>\` (e.g. g-kr-2.1-export-csv), fixed at lock. Each goal on a branch gets its own; finished ones are archived. Not on main/develop: use a worktree branch
- **Locked** - Check is fixed. Only you can unlock; the agent cannot touch it
- **Done-check** - Shell command that fails now and passes when the outcome is met
- **Outcome Check** - The command you mark at lock as testing the outcome from outside
- **Weaker check on relock** - Type the goal id to confirm
## EXPLICATION
Say what "done" means as a command before you start; the session stops when it goes green.
Flow: /goal, /goal lock (one pick), work, /goal (offers to close when green), then /goal for the next goal.
Wrong check? /goal unlock, fix, /goal lock. Don't want it? /goal drop.
Store: the todo store (one file per branch). Tamper ref: \`refs/goals/<branch>\`
`;
