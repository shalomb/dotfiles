Feature: /worktree moves the pi session into a new worktree
  As a user, I want one command to start isolated work in a worktree
  so that the agent's tools, AGENTS.md and footer all use that directory.

  Background:
    Given a git repository with a commit on branch "main"
    And pi runs in the repository root

  Scenario: Hop into a new worktree
    When the user runs "/worktree fix the login redirect"
    Then a worktree exists at ".worktrees/feat-fix-the-login-redirect"
    And the session cwd is that worktree
    And "git branch --show-current" prints "feat/fix-the-login-redirect"
    And the first user message holds the origin path, the Base and the instructions

  Scenario: The Brief is written before the switch
    When the user runs "/worktree add a retry"
    Then the new session file contains a user message before pi switches to it

  Scenario: Flags override the defaults
    When the user runs "/worktree --type fix --branch fix/login --base v1.2 repair login"
    Then the branch is "fix/login"
    And the branch starts at "v1.2"

  Scenario: A worktree AGENTS.md is loaded
    Given the branch has an AGENTS.md that the origin checkout lacks
    When the user runs "/worktree start"
    Then the agent context lists that AGENTS.md

  Scenario: Dirty origin gives a warning, not a block
    Given the origin checkout has an uncommitted file "notes.txt"
    When the user runs "/worktree start"
    Then the user sees a warning
    And the Brief lists "notes.txt"
    And the hop completes

  Scenario: An existing worktree is reused
    Given a worktree for branch "feat/start" exists
    When the user runs "/worktree --branch feat/start continue"
    Then no second worktree is made
    And the session cwd is the existing worktree

  Scenario: Hop from inside a worktree makes a sibling
    Given pi runs in ".worktrees/feat-a"
    When the user runs "/worktree more work"
    Then the new worktree is under the common root ".worktrees/"
    And the Base is the HEAD of "feat/a"

  Scenario: The exclude file is updated, .gitignore is not committed
    Given ".worktrees/" is not ignored
    When the user runs "/worktree start"
    Then the shared git exclude file contains ".worktrees/"
    And no commit changes ".gitignore"

  Scenario: Back returns to the origin
    Given the user hopped from the origin checkout
    When the user runs "/worktree back"
    Then the session cwd is the origin checkout
    And the worktree still exists

  Scenario: Back without a parent
    Given the session has no parent session
    When the user runs "/worktree back"
    Then the user sees "no parent session"
    And the session does not change
