Feature: Three-Stream Learning Loop and Two-Stage Intent Governor
  As the Main Copilot and Human Partner
  We want discoveries from each Task Run to sharpen open tasks, route defects by severity, and govern backlog growth
  So that the system converges toward the North Star without runaway backlog inventory

  Scenario: Ingress Admission Filter diverts non-urgent findings into Observations
    Given Task Run "t-04" finishes with a non-blocking code smell in "src/auth.ts"
    When the Ingress Admission Filter evaluates the finding
    Then no new task card is created in the "todo" backlog
    And an Observation anchored to "src/auth.ts" is appended to "trajectories.jsonl"

  Scenario: Recurring Observations boost WSJF via Observation Heat at wave replanning
    Given "trajectories.jsonl" contains 3 Observations anchored to "src/auth.ts"
    And open task "t-09" in the "todo" backlog is anchored to "src/auth.ts"
    When the Wave Scheduler runs "todo replan" at the wave boundary
    Then the Cost of Delay for task "t-09" increases by the Observation Heat bonus for "src/auth.ts"
    And task "t-09" links to the matching Observation pointers

  Scenario: Unassigned recurring Observations promote to a backlog task when converging
    Given "trajectories.jsonl" contains 2 Observations anchored to "src/parser.ts"
    And no open task in the "todo" backlog is anchored to "src/parser.ts"
    And the wave Convergence Ratio is 0.4
    When the Wave Miner runs at the wave boundary
    Then a new task card anchored to "src/parser.ts" is created in the "todo" backlog

  Scenario: Diverging Convergence Ratio triggers aggressive folding and pruning
    Given Wave 2 added 5 tasks and completed 3 tasks (Convergence Ratio 1.67)
    When the Intent Governor runs at the end of Wave 2
    Then standalone P2 and P3 candidate tasks are blocked from admission
    And minor fixes are folded into the next task on the same anchor as acceptance criteria
    And low-WSJF leaf tasks without a North Star link are pruned

  Scenario: An unverified finding is logged, not folded into work
    Given a Builder reports a P2 finding of 5 lines that cites a check command
    And the cited check does not reproduce the finding
    When the Ingress Admission Filter evaluates the finding
    Then the finding is not folded into any task
    And it is logged as an Observation marked unverified
