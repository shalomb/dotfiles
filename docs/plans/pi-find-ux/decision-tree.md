# pi-find UX: decision tree

Stance: long horizon. The current code is evidence, not authority.

| Node | State | Decision |
| :-- | :-- | :-- |
| stance | settled | Long horizon. |
| ladder.trigger | settled | Rank all scopes together: score = match x scope weight (as /locate). |
| expand.source | settled | Local vocabulary + fuzzy match. No LLM call. |
| search.engine | settled | SQLite FTS5 + trigram fuzzy. |
| ui.fzf | settled | fzf with preview on a TTY; table/JSON when piped. |
| profile.scope | settled | Search ALL pi sessions on disk, whatever started them. Profile is a column, not a filter. |
| resume.action | settled | Enter does `cd` into a worktree of the session's repo, then resumes. Never start at the repo top level. |
| worktree.target | settled | Original worktree. If gone or top level, fzf asks: pick existing or create new. |
| source.discovery | settled | Scan known session roots; config adds more. gum supplies repo roots and worktree lists (repo scope, target worktree). |
| pi-profile.seam | settled | pi-find owns search and resume. pi-profile gives the launch env. |

Notes sorted from round 1:
- Q6 note = correction. pi-find is not limited to pi-profile sessions. It must find all pi sessions. Opens `source.discovery`.
- Q7 note = constraint + new branch. Resume belongs in a worktree. Opens `worktree.target`.

- Round 2 note on source.discovery = decision (constraint): use gum(1) for repo roots. gum already feeds repo name/remote (`~/.cache/gum/gum.db`).

Replies: round-01.md, round-02.md

## waf nodes (round 3)
| Node | State | Decision |
| :-- | :-- | :-- |
| waf.cost-overhead-cap | settled | Incremental index. p95 300 ms at 5000 sessions. |
| waf.concurrency | settled | SQLite WAL. Short writes. No lock held in fzf. |
| waf.partial-salvage | settled | Degrade by layer. Skip and count bad files. |
| waf.cold-start | settled | Plain OR match at small N. Recent list on empty term. |
| waf.falsifiable-hypotheses | settled | H1-H3 with kill thresholds. See handoff.md. |

Round 3 note = process request: explain the H numbers in plain STE in every waf round. Applied in the final review round. A change to the design-thinking skill is not made yet.

Replies: round-01.md, round-02.md, round-03.md

Round 4: final review approved.

Round 5 (re-confirmation): H1, H2, H3 and thresholds kept as written. Replies: round-05.md
