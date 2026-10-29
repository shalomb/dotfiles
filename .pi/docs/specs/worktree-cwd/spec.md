---
status: approved
version: 1
owner: unop
type: handoff-spec
related: [decision-tree.md, GLOSSARY.md, rounds/, features/worktree.feature]
promotes_to: []
---

# /worktree: change the pi working directory into a new worktree

> **Status:** approved (round 4). **Owner:** unop. **Audience:** implementer, tester.
> **Scope:** one pi extension, `worktree-command.ts`, with logic in `_lib/worktree.ts`.
> Tool-started hops are out of scope (deferred).

## Who reads what

| Reader | Read, in order |
| :-- | :-- |
| Implementer | At a glance, Unit 1, Unit 2, Anti-goals |
| Tester | Goal, Units (contract blocks), `features/worktree.feature` |
| Owner | Goal, Anti-goals, Open decisions |

## At a glance

```
/worktree [flags] <text>
   |
   v
 origin checkout --(1 git exclude, 2 git worktree add)--> worktree
   |                                                         |
   | 3 SessionManager.create(worktree, parent=origin session)|
   | 4 append BRIEF as user message   <-- file exists only now|
   | 5 switchSession(file)                                   |
   +---------------------------------------------------------+
                         |
                         v
   new session: cwd = worktree, first turn = instructions

/worktree back --> switchSession(header.parentSession)
```

## Goal and success metric

`/worktree <instructions>` makes a **Worktree** and moves the session into it.
One call gives a session whose `pwd`, `AGENTS.md` and branch match the worktree.
`/worktree back` restores the origin cwd and session.

## Unit 1: Hop

**Who / When:** the user, by command, in any git checkout, including a worktree.

Contract (Strict STE):

- The extension MUST add `.worktrees/` to the shared git exclude file before `git worktree add`.
- The extension MUST make the worktree at `<common root>/.worktrees/<branch with "/" as "-">`.
- The extension MUST name the branch `<type>/<slug>`. Default type: `feat`.
- The extension MUST start the branch at the **Base**. Default Base: the current HEAD.
- The extension MUST create a session whose header cwd is the worktree and whose parent is the origin session.
- The extension MUST append the **Brief** as a user message BEFORE `switchSession()`.
  Pi writes the session file only after a user or assistant message exists. Without it,
  `SessionManager.open()` falls back to `process.cwd()` and the hop stays in the old directory.
- The Brief MUST hold: origin path, Base, branch, parent session path, `git status --short`, the instructions, and a request to run the baseline checks.
- The extension MUST send the Brief as the first turn. It MUST NOT make a model call to write the Brief.
- The extension SHOULD warn when the origin checkout is dirty, and SHOULD list the dirty files in the Brief.
- The extension MAY reuse an existing branch or worktree. It SHOULD warn when that worktree is dirty.
- Inside a worktree, the extension MUST make a sibling worktree under the common root. Base: the current HEAD.
- The extension MUST NOT commit `.gitignore`. It SHOULD tell the user when `.gitignore` lacks `.worktrees/`.

<details><summary>Machine-readable contract</summary>

```yaml
command: worktree
flags: {type: "feat|fix|docs|refactor|chore|test|perf|style|ci", branch: string, base: string}
defaults: {type: feat, base: HEAD, slug_max: 40, clash_suffix: "-2"}
paths: {worktree: "<common root>/.worktrees/<branch with / as ->"}
order: [exclude, worktree_add, session_create, brief_message, switch_session, first_turn]
invariants: [brief_before_switch, no_model_call_for_brief, no_gitignore_commit, no_chdir]
```

</details>

## Unit 2: Back

**Who / When:** the user, from a worktree session.

- `/worktree back` MUST switch to the header `parentSession`.
- The extension MUST NOT remove the worktree or the branch.
- If no parent session exists, the extension MUST tell the user and stay.

## Unit 3: Naming and flags

- `--type` MUST be a Conventional Commit type (see `git-commit-formatter`).
- `--branch` overrides `<type>/<slug>`. `--base` overrides the Base.
- The Slug is lowercase, uses `-` between words, and has at most 40 characters.
- If the branch name clashes with another branch that has a different worktree, the extension MUST add `-2`, `-3` and so on.

## Anti-goals

- No `process.chdir()`. No `cd` instructions to the agent.
- No automatic removal of worktrees.
- No commit of `.gitignore`.
- No model-written Brief.
- No agent-started hop in version 1.

## Open decisions

| Id | Question | Owner | Needed before |
| :-- | :-- | :-- | :-- |
| spike.tool-hop | Can a tool call start a hop? | unop | version 2 |

## Verified by POC (2026-10-29)

Bash `pwd` and branch, the powerline directory and branch, the worktree `AGENTS.md`, and `back` all worked in a live pi.

## Links

[Decision tree](decision-tree.md) · [Glossary](GLOSSARY.md) · [Rounds](rounds/) · [Scenarios](features/worktree.feature)
