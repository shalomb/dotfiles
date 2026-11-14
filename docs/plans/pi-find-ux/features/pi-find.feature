Feature: Recall a pi session I half remember
  As a developer returning to a repository
  I want pi-find to find the session I mean
  So that I continue my work in the right worktree

  Scenario: One remembered word is wrong
    Given a session about "github runners epic" exists in this repository
    When I search for "github runner epik"
    Then that session is among the top 5 results

  Scenario: Near sessions rank above far sessions
    Given two sessions match my term equally
    And one ran in this repository and one ran elsewhere
    When I search for the term
    Then the session from this repository ranks first

  Scenario: Sessions from every profile are found
    Given a session started under another profile
    When I search for its term
    Then it appears with its profile shown

  Scenario: Resume lands in a worktree
    Given the selected session ran in a worktree that still exists
    When I choose it
    Then I am in that worktree
    And the session is resumed in its profile

  Scenario: Original worktree is gone
    Given the selected session ran in a worktree that was deleted
    When I choose it
    Then I am asked to pick an existing worktree or create one
    And I am never placed at the repository top level

  Scenario: Output is piped
    When I run pi-find with output piped
    Then I get a plain table with no fzf

  Scenario: fzf is not installed
    Given fzf is missing
    When I run pi-find on a terminal
    Then I get the plain table and a short notice
