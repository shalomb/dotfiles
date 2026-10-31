Feature: Work Batch Execution and Tiered Critic Gate
  As the Main Copilot
  I want cohesive Work Batches executed in Transient Worktrees and verified by a Tiered Critic Gate
  So that each task lands as an atomic commit on the Feature Worktree without polluting my context window

  Scenario: Low-risk Work Batch merges via Deterministic Gate without a second subagent
    Given the Feature Worktree is clean at commit "base-sha"
    And the Batch Planner creates Work Batch "batch-01" with tasks "t-01" and "t-02"
    And "batch-01" does not touch hub files, public APIs, or proposed ADRs
    When the Builder completes "batch-01" in Transient Worktree "wt-batch-01"
    Then "wt-batch-01" contains 2 ACP commits corresponding to "t-01" and "t-02"
    And the Deterministic Gate rebases "wt-batch-01" onto the Feature Worktree and runs the test suite
    And no separate Adversarial Critic subagent is spawned
    And the Feature Worktree fast-forwards to the head of "wt-batch-01"
    And the Main Copilot receives a Batch Receipt of at most 25 lines with Context Pointers

  Scenario: High-risk Work Batch triggers the independent Adversarial Critic
    Given Work Batch "batch-02" modifies a high-fan-out hub module
    When the Builder completes "batch-02" and the Deterministic Gate passes
    Then the runner spawns an independent Adversarial Critic in "wt-batch-02"
    And the Adversarial Critic verifies the rebased diff against the Feature Worktree
    And the Feature Worktree fast-forwards only after the Adversarial Critic records an approved verdict

  Scenario: Builder escalates an assumption break after 2 failed local retries
    Given the Builder is executing Work Batch "batch-03"
    When a test or constraint fails twice consecutively during local retries
    Then the Builder runs the OHECI loop to classify the failure
    And the Builder halts further retries and emits a blocked Batch Receipt with a Context Pointer to the failing hypothesis
