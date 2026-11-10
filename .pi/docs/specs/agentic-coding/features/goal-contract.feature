Feature: Goal Contract with a locked Done-check
  As the Human Partner
  I want each branch's goal stored with a Done-check that I confirm before work starts
  So that "done" is a command result, not a claim, and work stops when the goal is met

  Rule: A Done-check is locked only if it can fail

    Scenario: A Done-check that already passes on the base commit is refused
      Given branch "feat/export" has a draft goal "Users can export a backlog as CSV"
      And the draft Done-check passes on the base commit
      When the Human Partner tries to lock the Done-check
      Then the Done-check is not locked
      And the Human Partner is told that the check must fail before the work starts

    Scenario: A Done-check that fails on the base commit is locked
      Given branch "feat/export" has a draft goal with a Done-check that fails on the base commit
      When the Human Partner confirms the Done-check
      Then the Done-check is locked with the base commit it failed on

  Rule: Only the Human Partner can change a locked Done-check

    Scenario: The Main Copilot proposes a change to a locked Done-check
      Given branch "feat/export" has a locked Done-check
      When the Main Copilot proposes to remove one of its checks
      Then the Done-check stays unchanged until the Human Partner approves
      And an approved change is recorded with who approved it and why

  Rule: A goal closes only on a green Done-check

    Scenario: Closing a goal while its Done-check fails is refused
      Given branch "feat/export" has an active goal whose Done-check fails
      When the Human Partner asks to close the goal
      Then the goal stays active
      And the failing check output is offered as a pointer

    Scenario: Closing a goal with a green Done-check records the hand-off
      Given branch "feat/export" has an active goal whose Done-check passes
      When the Human Partner asks to close the goal
      Then the goal is closed
      And a notice suggests /persist, lessons learned and the next goal, and runs none of them

    Scenario: A design goal without a command check closes as an assertion
      Given branch "design/sync" has an active goal with a human-confirm Done-check
      When the Human Partner confirms the outcome is met
      Then the goal is closed and recorded as closed by assertion

  Rule: Work links to the active goal without extra effort

    Scenario: A task created on a branch with an active goal is linked to it
      Given branch "feat/export" has an active goal "g-export"
      When a task "Add CSV header row" is added on that branch
      Then the task is linked to goal "g-export"

    Scenario: The goal of a merged branch is flagged at session start
      Given branch "feat/export" has an active goal
      And "feat/export" has been merged and deleted
      When a new session starts in the repository
      Then the Human Partner is asked to close or drop the goal of "feat/export"

  Rule: A lock is only as strong as what it checks

    Scenario: Locking needs an Outcome Check
      Given branch "feat/export" has a draft goal whose Done-check fails on the base commit
      When the Human Partner locks it without marking any command as the Outcome Check
      Then the Done-check is not locked

    Scenario: A base failure caused by the environment does not lock by default
      Given the draft Done-check fails on the base commit with "command not found"
      When the Human Partner tries to lock the Done-check
      Then the Done-check is not locked
      And the Human Partner may lock it only by typing the goal id

    Scenario: A Weakening Change needs the goal id typed
      Given branch "feat/export" has a locked Done-check with two commands
      And the Main Copilot proposes to remove one of them
      When the Human Partner answers yes without typing the goal id
      Then the Done-check stays unchanged

    Scenario: A locked Done-check edited outside /goal blocks closure
      Given branch "feat/export" has a locked Done-check
      And the goal file's Done-check was changed without /goal
      When the Human Partner asks to close the goal
      Then the goal stays active
      And the Human Partner is told the Done-check differs from the approved one

  # ADR-011; rounds/goal-ux/
  Rule: A draft starts from what already exists

    Scenario: An outcome that is partly true is reported before any check
      Given the code already shares one todo store across worktrees
      When the Human Partner starts a goal "todo is cognizant of worktrees"
      Then the draft reports the outcome as partly true
      And each claim names a path and a command the Human Partner can rerun

    Scenario: A goal whose code is in another repo is proposed there
      Given the code for the outcome is in repo "agent-skills"
      When the Human Partner starts the goal in repo "dotfiles"
      Then the draft proposes to start the goal in "agent-skills" on a new branch
      And no goal is started in "agent-skills" without the Human Partner

    Scenario: A clear goal is drafted without questions
      Given the outcome names its repo and an observable result
      When the Human Partner starts the goal
      Then the Main Copilot drafts the contract without asking questions

  Rule: Draft problems are shown at save, without running the draft

    Scenario: A check that names a missing script is flagged at save
      Given a draft check runs a script that does not exist
      When the draft is saved
      Then the Review Card warns that the script is missing
      And no draft command has run

    Scenario: An anchor under an install directory is flagged at save
      Given a draft anchor is a path under the uv tools directory
      When the draft is saved
      Then the Review Card warns that the anchor is not source

    Scenario: A goal started on a shared branch offers a worktree
      Given the current branch is "develop"
      When the Human Partner starts a goal
      Then the Human Partner is offered a new worktree for the goal
      And the goal is started where the Human Partner chooses

    Scenario: Every draft ends with one next step
      When a draft is saved
      Then the Review Card ends with one line naming lock, change and drop

  Rule: A finished goal does not end the session

    Scenario: The next goal is drafted from the discussion
      Given the goal of the branch is closed or dropped
      When the Human Partner runs "/goal"
      Then a new draft replaces it and the Main Copilot proposes the next goal from the discussion
      And a goal_started event records the id of the goal it follows
      And the draft is not locked

    Scenario: The Main Copilot proposes a goal after the last one finished
      Given the goal of the branch is closed or dropped
      When the Main Copilot proposes a goal
      Then it is saved as a new draft that only the Human Partner can lock

    Scenario: A command that does not fit the state names the next step
      Given the goal of the branch is closed or dropped
      When the Human Partner runs "/goal done", "/goal unlock", "/goal lock" or "/goal drop"
      Then the refusal ends with the command that drafts the next goal

    Scenario: close is another word for done
      When the Human Partner runs "/goal close"
      Then it behaves as "/goal done"
