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
      And a hand-off with lessons learned is written for the branch

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
