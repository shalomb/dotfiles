# GRILL ROUND 1 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [horizon.stance] -- Which stance must govern existing code and Springfield ADRs?

CONTEXT:
  You want to design an agentic coding system from first principles.
  Springfield (Go binary + td + 5 personas) and pi extensions already
  exist.
>> We must think critically if they are the best foundation for a new
>> system tho.
  Under a long-horizon stance, existing code and Springfield ADRs are
  evidence, not authority.

OPTIONS:
  [x] A. Long horizon (zero-based)  (RECOMMENDED)
         Treat Springfield and pi extensions as evidence. Redesign
         freely from first principles.
  [ ] B. Mid-execution (evolve Springfield)
         Keep Springfield Go binary, td store, and 5-agent model as the
         fixed foundation.

## Q2 [artefact.home] -- Where must the session write the decision tree and artefacts?

CONTEXT:
  We are in /home/unop. Design sessions store artefacts next to the
  decision tree.
  ~/.pi/docs/specs/<topic>/ holds pi specs (such as worktree-cwd).
  ~/shalomb/springfield/docs/ holds the existing Springfield repository
  docs.

OPTIONS:
  [x] A. ~/.pi/docs/specs/agentic-coding/  (RECOMMENDED)
         Keeps the new architecture inside pi specs and neutral across
         repos.
  [ ] B. ~/shalomb/springfield/docs/specs/
         Places artefacts directly inside the Springfield repository.

## Q3 [control.topology] -- Which component must own the control loop and human interaction?

CONTEXT:
  Springfield uses a standalone Go binary that runs headless agents
  without a live human copilot.
  You want the main agent to act as the real copilot with the human and
  corral subagent work.
  Lexler's Orchestrator and Offload Deterministic patterns keep LLM
  attention on intent and integration, not polling.

OPTIONS:
  [x] A. Interactive Copilot + deterministic runner  (RECOMMENDED)
         Main pi agent owns human intent, batching, and branch merge.
         Subprocess runner handles lifecycle.
  [ ] B. Standalone Go daemon above all agents
         Go binary schedules every persona (Lisa, Ralph, Bart). No
         persistent human copilot session.
  [ ] C. Pure prompt-driven main agent
         Main LLM polls panes and manages processes directly. High risk
         of context pollution.

DIAGRAM:
  Option A (Copilot + Deterministic Runner):
    Human <-> Main Copilot (intent, batching, merge)
                   |
                   +--> Subagent Runner (bg_run / deterministic)
                          |-- Worker 1 (worktree A, batch 1)
                          +-- Worker 2 (worktree B, batch 2)

  Option B (Standalone Daemon):
    Human -> Backlog -> Go Daemon -> Lisa -> Ralph -> Bart

## Q4 [state.backlog-store] -- Which backlog CLI must store intent, batches, and learning signals?

CONTEXT:
  Your environment has two backlog CLIs: `todo` (todo-navigator) and
  `td` (used in Springfield ADR-008).
  `todo` stores markdown task cards in
  ~/.cache/agent-skills/todos/<repo_slug>/ with WSJF waves and
  file-locked claims.
  `td` stores Epics, issues, and decision logs in a repo-local
  .todos/issues.db SQLite database.

OPTIONS:
  [x] A. Extend `todo` CLI as single store  (RECOMMENDED)
         Zero repo pollution, native pi skill integration,
         human-editable markdown cards in tmux popups.
  [ ] B. Use `td` SQLite as single store
         Typed SQL queries and structured decision logs, but adds a
         .todos/ DB per repo.
  [ ] C. Dual store (`todo` for intent, `td` for runs)
         Separates human backlog from machine state, but risks sync
         drift between two stores.

## Q5 [work.batching] -- How must the main agent group backlog tasks into a subagent run?

>> I get the sprit of the question but there's an implication that we intend
>> for the main agent to be batching tasks? There are pros and cons to that,
  >> but I think we should be careful about the assumption that the main agent
  >> is the one doing the batching. It could be a subagent or a separate
  >> batching agent that handles this.@7

CONTEXT:
  Atomic tasks are too small for one subagent spin-up, worktree
  creation, and cold start.
  Large epics are too big and cause context degradation inside the
  worker.
  Each task inside a batch must still produce its own atomic git commit
  under ACP.

OPTIONS:
  [x] A. Cohesive Wave Batch (2-5 related tasks)  (RECOMMENDED)
         Groups tasks that share files or module boundaries. One
         worktree per batch, one ACP commit per task.
  [ ] B. One Epic per subagent worktree
         Subagent decomposes the whole epic via TDD. Larger scope and
         higher risk of mid-run drift.
  [ ] C. One atomic task per subagent worktree
         Strict isolation per task, but high worktree setup and
         cold-start overhead.

DIAGRAM:
  Backlog:  [T1: API]  [T2: CLI]  [T3: Tests]  [T4: Docs]
                \          /
                 v        v
  Batch B1 (cohesive file/module scope, 2-5 tasks)
    --> Transient Worktree (branch: batch/b1)
          |-- Commit 1 (ACP): T1 + test
          |-- Commit 2 (ACP): T2 + test
          +-- Receipt -> Main Copilot merges to Feature Worktree

## Q6 [context.hygiene] -- How must the system prevent context pollution in the main copilot?

CONTEXT:
  Long sessions pollute the main copilot context with tool outputs,
  diffs, and subagent logs.
  Lexler's patterns (Context Management, Offload Deterministic, Focused
  Agent, Knowledge Checkpoint) address this.
  The main agent needs high signal and low token noise over many
  batches.

OPTIONS:
  [x] A. Offload + Checkpoint + Compact Receipt  (RECOMMENDED)
         Subagents return only a compact structured receipt. Checkpoints
         flush state to disk before context reset.
>> And sub-agents use hyperlinks and contextual references/anchors to avoid
>> repeating context in the receipt.@7 An interested party (even the main
    >> agent) can follow the links to get the full context if needed. This
>> is@7 a common pattern in multi-agent systems to reduce context
>> pollution and@7 keep the main agent's context manageable.@7
  [ ] B. Continuous in-session compaction only
         Rely on LLM conversation summarization when the window fills.
         Loses sharp constraints over time.
  [ ] C. Stateless main agent per turn
         Restart the main agent after every batch. Loses conversational
         continuity with the human.

## Q7 [learning.loop-mechanism] -- Which learning mechanism must improve the system during execution?

CONTEXT:
  You want the system to improve how it solves problems during the work
  and across runs.
  True weight updates are not possible at runtime, so in-context RL uses
  verbal rewards, trajectories, and policy updates.
  We can combine inner-loop quality scoring with outer-loop memory
  grooming and rule promotion.

OPTIONS:
  [x] A. Two-tier Verbal RL + Policy/Rule Grooming  (RECOMMENDED)
         Critic scores every batch (reward) to tune batch/model routing
         and promote proven lessons into rules.
  [ ] B. Best-of-N parallel resampling per batch
         Run 2-3 subagents on the same batch and pick the highest-scored
         branch. High token cost.
  [ ] C. Post-session manual `/learn` reflection only
         Human reviews lessons at the end of the session. Does not adapt
         during the active run.

DIAGRAM:
  Subagent Run --> Critic Score (Farley/Adzic/ACP + Outcome)
                         |
                         +--> Retry (if score < threshold)
                         +--> Trajectory Signal (what worked/failed)
                                    |
                                    v
                         Policy Updater & Memory Groomer
                           |-- Promotes proven rules / anchors
                           +-- Tunes batch size & model routing

## TERMS

  Main Copilot: The interactive pi agent that partners with the human,
  manages the backlog, batches work, and consolidates branches into the
  feature worktree.
    Avoid: orchestrator daemon, master agent
  Work Batch: A cohesive set of 2 to 5 backlog tasks assigned to one
  subagent in one transient worktree, where each task produces one ACP
  commit.
    Avoid: epic, ticket list, chunk
  Feature Worktree: The git worktree where the Main Copilot holds the
  active feature branch and integrates validated Work Batches.
    Avoid: main repo, sandbox
  Transient Worktree: A short-lived git worktree branched from the
  Feature Worktree for a single Work Batch and deleted after
  consolidation.
    Avoid: worker clone, temp branch
  Batch Receipt: A bounded, structured summary returned by a subagent
  (commits, test scores, assumption breaks, lessons) that keeps raw logs
  out of the Main Copilot context.
    Avoid: summary, log dump
  Trajectory Signal: A structured record of batch outcome, critic
  scores, and surprises used to update routing policy and project rules
  during execution.
    Avoid: reflection note, chat summary
