Feature: Well-Architected Guardrails and Failure Recovery
  As the System Architect
  I want parallel Task Runs kept apart, findings verified, and learning kept behind evidence
  So that the system avoids rebase conflicts, false work and rules built on noise

  Scenario: Tasks that share a test file run in different waves
    Given ready tasks "t-10" and "t-11" both change "tests/unit/test_claims.py"
    When the Wave Scheduler plans the next wave
    Then "t-10" and "t-11" are placed in different waves

  Scenario: Tasks with disjoint code and tests run in parallel
    Given ready tasks "t-12", "t-13" and "t-14" share no modified file, test file or direct fan-out
    When the Wave Scheduler plans the next wave
    Then all three run in parallel, each in its own Transient Worktree

  Scenario: A wave never runs more than 3 tasks
    Given 5 ready tasks with disjoint code and tests
    When the Wave Scheduler plans the next wave
    Then the wave contains the 3 tasks with the highest WSJF

  Scenario: Synthesized rules start in warn-only canary mode
    Given the Rule Synthesizer generates a new check from 2 recurring Observations
    When the check is registered in the repository harness
    Then it runs in warn-only canary mode
    And it does not block a merge until the Human Partner promotes it
