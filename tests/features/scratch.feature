Feature: Shadow scratch notes
  A developer keeps working notes that survive reboots and never dirty the repository.

  Background:
    Given a repository with a worktree called "feat-x"

  Scenario: A note is tied to the repository and worktree
    When the developer opens the scratch note "ideas"
    Then the note is stored in the scratch store of that repository and worktree

  Scenario: Scratch notes never dirty the repository
    When the developer edits scratch notes 10 times
    Then the repository has no uncommitted changes

  Scenario: An agent finds the current note
    Given the developer has a scratch note "ideas"
    When an agent asks for the path of "ideas"
    Then the agent receives the path of that note

  Scenario: Notes of two worktrees stay apart
    Given the worktrees "feat-x" and "feat-y" each have a note "ideas"
    When the developer lists notes in "feat-x"
    Then only the note of "feat-x" is listed

  Scenario: Notes outlive a removed worktree
    Given the developer has a scratch note "ideas" in "feat-x"
    When the worktree "feat-x" is removed
    Then the note is still listed as an orphan

  Scenario: A repository with no remote still gets a store
    Given a repository with no remote
    When the developer opens the scratch note "ideas"
    Then the note is stored under the name of the repository directory
