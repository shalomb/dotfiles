Feature: Well-Architected Guardrails and Failure Recovery
  As the System Architect
  I want deterministic batching defaults, disjoint worktree locks, prefix salvage, and cold-start RL guards
  So that the system stays cheap, avoids rebase storms, preserves partial progress, and never overfits on small samples

  Scenario: Disjoint Codemap Lock serializes batches with overlapping module fan-out
    Given ready tasks "t-10" and "t-11" belong to Batch A touching "src/core/db.ts"
    And ready task "t-12" belongs to Batch B importing "src/core/db.ts"
    When "todo batch" computes the execution wave
    Then Batch A and Batch B are placed in sequential waves rather than dispatched concurrently

  Scenario: Prefix Salvage preserves green ACP commits when a later task in the batch blocks
    Given Work Batch "batch-05" contains tasks "t-21", "t-22", and "t-23" in order
    And the Builder commits "t-21" (SHA "c1") and "t-22" (SHA "c2") with passing tests under ACP
    When the Builder fails twice on "t-23" and escalates an OHECI assumption break
    Then the Deterministic Gate rebases and fast-forwards commits "c1" and "c2" onto the Feature Worktree
    And "todo" marks tasks "t-21" and "t-22" as done
    And "todo" releases task "t-23" as blocked with a Context Pointer to the OHECI failure log

  Scenario: Synthesized rules start in warn-only canary mode before hard enforcement
    Given the Rule Synthesizer generates a new "ast-grep" check from 2 recurring Observations
    When the check is registered in the repository harness
    Then the check runs in warn-only canary mode during the next wave
    And the check does not block a batch merge until promoted by human approval
