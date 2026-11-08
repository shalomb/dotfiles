/** The /goal man page (one popup page). Tested in goal-help.test.ts: every subcommand must appear here. */
export const GOAL_HELP = `# GOAL(1)
## NAME
goal - one checkable goal per branch, locked before work starts
## SYNOPSIS
/goal [<outcome>] | lock | unlock | done | drop | help
## COMMANDS
- **/goal** - No goal: agent drafts one from context. Draft: show card. Locked: card + check green/red
- **/goal <outcome>** - Same as /goal, seeding the outcome
- **/goal lock** - Lock the draft. Refuses if the check already passes on the base commit
- **/goal unlock** - Locked -> draft, to correct it. Logged; relock re-validates
- **/goal done** - Run the check; close if green, then /persist and lessons
- **/goal drop** - Abandon the goal
- **/goal help** - This page
## DESCRIPTION
- **States** - none -> draft -> locked -> closed
- **Draft** - Agent fills outcome, done-check, anti-goals, scope anchors, spec links via goal_propose. Only here
- **Locked** - Check is fixed. Only you can unlock; the agent cannot touch it
- **Done-check** - Shell command that fails now and passes when the outcome is met
- **Outcome Check** - The command you mark at lock as testing the outcome from outside
- **Weaker check on relock** - Type the goal id to confirm
## EXPLICATION
Say what "done" means as a command before you start; the session stops when it goes green.
Flow: /goal, review the card, /goal lock, work, /goal done.
Wrong check? /goal unlock, fix, /goal lock. Don't want it? /goal drop.
Store: the todo store (one file per branch). Tamper ref: refs/goals/<branch>
`;
