Feature: Task Run and Tiered Critic Gate
  As the Main Copilot
  I want each task built alone in its own Transient Worktree and verified before it lands
  So that every task lands as one verified atomic commit without polluting my context

  Scenario: A task touching only modules that earned low risk merges without a Critic
    Given the Feature Worktree is clean at commit "base-sha"
    And task "t-01" touches only modules with a recorded holdout score of at least 0.85
    And "t-01" touches no hub, public API or security path
    When the Builder completes "t-01" in its own Transient Worktree with one ACP commit
    Then the gate rebases the commit onto the Feature Worktree and the tests pass
    And no Adversarial Critic is spawned
    And the Feature Worktree fast-forwards to the commit
    And "t-01" is marked done with a closure timestamp

  Scenario: A task touching an unmeasured module is reviewed by the Critic
    Given task "t-02" touches a module with no recorded holdout score
    When the Builder completes "t-02" and the deterministic gate passes
    Then the Adversarial Critic reviews the rebased diff
    And the Feature Worktree fast-forwards only after the Critic approves

  Scenario: The Builder stops after 2 failed retries
    Given the Builder is running task "t-03"
    When its tests fail twice in a row
    Then the Builder classifies the failure with OHECI
    And returns a blocked receipt with a pointer to the failing hypothesis
    And nothing from "t-03" lands on the Feature Worktree

  Scenario: The Copilot verifies a receipt in one call
    Given task "t-01" has merged and its receipt has been delivered
    When the Main Copilot checks the receipt
    Then it makes exactly one verify-receipt call
    And the receipt carries no prose claim that it was verified
