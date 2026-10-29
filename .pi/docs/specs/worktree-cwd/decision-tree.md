# Design tree: /worktree -- change the pi working directory into a new worktree

Goal: `/worktree <instructions>` makes a worktree and moves the pi session into it.
Stance: long horizon

- [settled] stance -- Long horizon. The code is evidence, not authority. Round 1.
- [settled] cwd.mechanism -- New session whose header cwd is the worktree, then switchSession().
    Reason: pi binds cwd to the session header; no setCwd() exists. Round 1.
    Spike: SessionManager.create(wtDir, dir) + appendCustomEntry/appendMessage writes a file;
    SessionManager.open(file).getCwd() returns the worktree. Proven outside pi (bun, 2026-10-29).
- [settled] hop.continuity -- New session gets parent link, instructions, branch, short origin brief. Round 1.
- [settled] worktree.create -- Extension makes the worktree per using-git-worktrees; branch = slug of text, `--branch` overrides. Round 1.
- [settled] trigger -- Command only. Agent tool deferred. Round 1.
- [settled] return.path -- `/worktree back` switches to the parent session. No auto-remove. Round 1.
- [settled] spike.in-pi -- Hop works in a live pi (POC, 2026-10-29): bash pwd and git branch are in the worktree; powerline shows dir and branch.
    Lesson: pi writes a session file only after a user/assistant message exists. Seed the brief as a user message BEFORE switchSession(),
    or open() falls back to process.cwd() and the hop silently stays put.
- [settled] dirty.origin -- Allow, warn, list the dirty files in the brief. Round 2.
- [settled] brief.content -- Facts only, no model turn: origin path, base, branch, short git status, parent session, instructions. Round 2.
- [settled] hop.existing -- Reuse the existing branch/worktree and hop; warn if dirty. Round 2.
- [settled] first.turn -- Auto-send brief and instructions. Brief asks the agent to run the baseline (skill Step 3). Round 2.
- [settled] slug.rules -- Default type feat, branch <type>/<slug>, max 40, -2 on clash; --type from the Conventional Commit types. Rounds 2-3.
    Fact: git-commit-formatter lists types feat fix docs refactor chore test perf style ci. Skills show feat/ and test/ prefixes; no stricter rule.
    Open: how the type prefix is chosen.
- [settled] base.branch -- Default current HEAD of origin; --base overrides; recorded in the brief. Rounds 2-3.
    Fact: finishing-a-development-branch reads the base from "plan, conversation, upstream", so the brief must record the base.
- [settled] instr.interpret -- Flags now (--type --branch --base), defaults otherwise; agent-chosen values later if spike.tool-hop passes. Round 3.
- [open] spike.tool-hop -- Can a tool call start a hop (needs command ctx for switchSession)? Unknown.
- [settled] ignore.handling -- Add .worktrees/ to the shared git exclude file; tell the user about .gitignore. No commit. Round 3.
- [settled] nested.origin -- Inside a worktree: make a sibling under the common root, base = current HEAD. Round 3.
- [settled] success.metric -- One /worktree call gives a session whose pwd, AGENTS.md and branch match; /worktree back restores origin cwd and session. Round 3.
- [settled] powerline.cwd -- Follows the hop with no change to the footer (POC). Was: The user wants the powerline footer cwd (and branch) to follow the hop. Round 3 note; POC decides.
- [settled] spike.agents-md -- Worktree-local AGENTS.md loads after the hop (agent reported both files and the marker). User run, 2026-10-29.
- [settled] spike.back -- `back` via header parentSession works (user: 'works just fine'). User run, 2026-10-29.
