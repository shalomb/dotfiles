# Handoff: pi-find UX

## What
`pi-find` finds a pi session from a half-remembered term. It ranks sessions across widening scopes. It opens fzf. Enter goes to the right worktree and resumes in the right profile.

## Why
Today one wrong word returns nothing, output is a table you must copy from, and only one profile is searched.

## Settled design
See [decision-tree.md](decision-tree.md), [GLOSSARY.md](GLOSSARY.md), [architecture.md](architecture.md), [features/pi-find.feature](features/pi-find.feature).

ADRs: [014 ranking](../../architecture/ADR-014-rank-sessions-by-weighted-scope.md), [015 index](../../architecture/ADR-015-session-index-fts5-trigram.md), [016 worktree resume](../../architecture/ADR-016-resume-in-worktree.md).

## Hypotheses (spikes run first)
- **H1 Recall.** If it fails: ranking is not worth building. Kill below 90% of 20 replayed real queries with one term in three wrong, target in top 5.
- **H2 Speed.** Kill if first fzf frame is slower than 300 ms at p95 with 5000 sessions.
- **H3 Resume.** Kill if Enter ever lands at the repo top level when a worktree exists.

## Boundaries (anti-goals)
- No LLM call in the search path.
- No file-system-wide scan for sessions.
- No change to session jsonl files.
- No merge of pi-find into pi-profile.
- Never start a session at the repo top level.

## Tickets
1. Spike H1: replay 20 queries on FTS5+trigram.
2. Spike H2: time 5000 synthetic sessions.
3. Spike H3: resolver against real worktrees and gum.
4. Multi-root session discovery plus profile column.
5. Ranker with scope weights.
6. fzf front end with preview, TTY detection, degrade paths.
7. Resume through pi-profile launch env.
8. Incremental indexing, WAL, skip and count bad files.
