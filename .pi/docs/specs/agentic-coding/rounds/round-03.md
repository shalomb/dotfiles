# GRILL ROUND 3 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [control.topology.merge-authority] -- Must the Adversarial Critic also own rebase and integration into the Feature Worktree?

CONTEXT:
  In Round 2 you asked if the Integrator subagent is the adversarial
  agent (Bart).
  In Q3 we settled that a Builder pass is followed by a Critic pass
  inside the Transient Worktree.
  If the Adversarial Critic rebases the Transient Worktree onto the
  Feature Worktree BEFORE running its review and tests, it verifies the
  exact post-merge state and fast-forwards on approval.

OPTIONS:
  [x] A. Unify Critic + Integrator (rebase then review)  (RECOMMENDED)
         One adversarial agent (Bart) rebases onto Feature Worktree,
         verifies the integrated code, and merges if green.
  [ ] B. Separate Critic (pre-rebase) and Integrator (post)
         Critic reviews the branch in isolation first, then a second
         Integrator agent rebases and re-tests.
  [ ] C. Deterministic script merges; Critic only on conflict
         Skips adversarial review when tests pass, which misses untested
         edge cases.

DIAGRAM:
  Transient Worktree (Builder finishes ACP commits)
         |
         v
  Adversarial Critic & Integrator (Bart role, same worktree)
    1. Rebase onto Feature Worktree (resolve trivial / flag clash)
    2. Run adversarial tests, Farley/Adzic checks, and ACP audit
    3. PASS -> Fast-forward Feature Worktree + emit Batch Receipt
       FAIL -> Write feedback for Builder retry OR escalate conflict

## Q2 [learning.loop-mechanism.policy-target] -- Which learning streams must every Trajectory Signal produce?

CONTEXT:
  In Round 2 you pointed out that learning is not just harness tuning.
  It has two core product classes during execution.
  Class 1 (Forward Refinement): What we learn while building Batch N
  reduces uncertainty and sharpens outstanding backlog tasks toward the
  North Star.
  Class 2 (Course Correction): Discovering that standing code or an
  earlier assumption is defective, which requires a decision and new
  backlog intent.

OPTIONS:
  [x] A. Three-stream loop: Backlog + Course-Correct + Rules  (RECOMMENDED)
         Treats backlog sharpening and defective-code course correction
         as primary, alongside rule synthesis.
  [ ] B. Backlog refinement and course correction only
         Focuses 100% on product intent and code state; leaves harness
         rules and model routing static.
  [ ] C. Harness tuning and rule synthesis only
         Tunes prompts and models, but leaves open backlog tasks stale
         as reality changes.

DIAGRAM:
  Critic Trajectory Signal (after Batch N)
    |
    +--> Class 1: Forward Refinement (sharpen open `todo` cards)
    +--> Class 2: Course Correction (standing defect -> new intent)
    +--> Class 3: Harness & Rules (anchors, ast-grep, model routing)

## Q3 [learning.loop-mechanism.backlog-refinement] -- How must Class 1 learnings sharpen outstanding tasks in the backlog?

CONTEXT:
  When Batch N finishes, it reveals real constraints (new helper
  signatures, API quirks, edge cases) that affect unstarted tasks in
  `todo`.
  If unstarted tasks stay as vague stubs, the next subagent starts with
  outdated assumptions.
  The Batch Planner (Lisa role) runs at the Last Responsible Moment
  (LRM) between waves and can apply Class 1 signals directly to open
  `todo` cards.

OPTIONS:
  [x] A. Batch Planner updates open `todo` cards at LRM  (RECOMMENDED)
         Applies batch discoveries to open task cards and re-runs `todo
         replan` right before the next wave.
  [ ] B. Critic edits open `todo` cards directly after each batch
         Immediate update, but parallel Critics in the same wave can
         race on open backlog cards.
  [ ] C. Main Copilot manually edits every open `todo` card
         High human visibility, but pulls detailed task-card editing
         back into Main Copilot context.

DIAGRAM:
  Wave N Critic emits Class 1 Signal (constraints + anchors)
         |
         v
  LRM Batch Planner (before Wave N+1)
    |-- Enriches open `todo` cards with discovered anchors
    |-- Prunes tasks made redundant by Wave N
    +-- Re-computes WSJF waves and forms Wave N+1 Work Batches

## Q4 [learning.loop-mechanism.course-correction-gate] -- How must the system turn a Class 2 defect discovery into new intent?

CONTEXT:
  Sometimes a subagent discovers that standing code on the Feature
  Worktree is defective or an architectural assumption is broken (Class
  2).
  Minor defects (localized bug, missing test, small refactor) can become
  new `todo` tasks automatically.
  Structural defects that invalidate the design or North Star intent
  require the Main Copilot and human to make a course-correction
  decision.

OPTIONS:
  [x] A. Severity split: auto-task local bugs, escalate design breaks  (RECOMMENDED)
         Local defects become `todo` tasks automatically; design breaks
         pause dependent batches and ask the Copilot/Human.
  [ ] B. Escalate every discovered defect to Human + Copilot
         Maximum human control, but interrupts the human for routine
         tech debt or bug fixes.
  [ ] C. Builder fixes standing defects inline inside current batch
         Fast fix, but violates ACP scope boundaries and causes merge
         conflicts with parallel batches.

DIAGRAM:
  Class 2 Signal (Standing Code / Design Defect)
         |
         +-- Local defect (fits current design)
         |     --> Auto-create `todo` task card + wire dependency
         |
         +-- Architectural / Intent break (challenges design)
               --> Halt dependent batches -> Ask Copilot & Human

>> How do we ensure a runaway problem is prevented by the system generating more intent than value output or outcomes realised? If we keep stacking up inventory then we spend a lot of time and agent focus just managing intent. This is, at least to me, a little bit of a hard problem to solve and we should sharpen intent management. It might be that as intent grows through feedback generation over many iterations, we have to perhaps tune the level of aggression a pruning routine takes to reconsolidate (or prune some of these trivial backlog items in favour of the batches that an agent or the delegates take on to implement).

## Q5 [work.batching.retry-escalation] -- When must a subagent stop local retries and escalate an assumption break?

CONTEXT:
  When a Builder fails a test or the Critic rejects a commit inside a
  Transient Worktree, the subagent needs a bounded recovery rule.
  In Springfield, infinite or unstructured retries burned tokens when an
  assumption was fundamentally broken.
  The OHECI loop (Observe, Hypothesize, Experiment, Conclude, Iterate)
  gives the Builder a strict cap before declaring an assumption break.

OPTIONS:
  [x] A. Max 2 Builder-Critic retries, then OHECI escalate  (RECOMMENDED)
         Fixes normal bugs locally in 1-2 passes; surfaces real
         assumption breaks fast without burning tokens.
  [ ] B. Single pass only (fail immediately to Main Copilot)
         Zero retry tokens, but forces Main Copilot to handle trivial
         test typos.
  [ ] C. Retry until wall-clock timeout expires
         Maximizes autonomous completion, but wastes tokens when the
         approach itself is wrong.

>> Just thinking out loud. Spinning up a separate sub-agent to perform the critical or adversarial review has the new agent session repopulate a lot of context in order to carry out the task. On its own this may be a good thing and definitely needed at some points but perhaps not always.[106;5u[106;5uThere may be times where it may be fine and acceptable for the main delegate or sub-agent that takes on the task (or rather a batch of tasks) to implement, to maybe do its own critical review and save or avoid the expense of a new sub-agent and tokens wasted just on setting up new sessions, etc. I suppose we also avoid a class of problems by the critical review agent making a different set of assumptions and biases that it may have, by having one agent do this work.[106;5u[106;5uI suppose there is no right answer and we've got to come up with a strategy in the implementation to generate quality output but yet also be fast in implementation (because the overall system needs fast integrated learning). Two agents to do a certain task can add quite some latency and turnaround before the main agent is able to consider the produce of that batch for learning.

## TERMS

  Critic Gate: The adversarial subagent (Bart role) that rebases a
  completed Work Batch onto the Feature Worktree, runs adversarial and
  regression checks, and fast-forwards on pass.
    Avoid: separate merger, passive reviewer
  Forward Refinement: Class 1 learning where discoveries from a
  completed Work Batch enrich open `todo` task cards with concrete
  anchors and constraints to reduce uncertainty toward the North Star.
    Avoid: backlog grooming, ticket edit
  Course Correction: Class 2 learning where a discovered defect in
  standing code or design assumptions generates new `todo` intent or
  triggers a Main Copilot design pivot.
    Avoid: hotfix, ad-hoc patch
