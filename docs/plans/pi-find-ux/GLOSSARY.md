# Glossary: pi-find

- **Session**: one pi conversation stored as a jsonl file. Avoid: chat, run.
- **Scope**: a level of the search ladder: cwd, repo, parent, home, registry. Avoid: zone, ring, tier.
- **Widening**: search in the next scope when near scope gives few matches.
- **Term expansion**: add related words to the user's term before the search.
- **Session root**: a directory that holds session files. There can be many. Avoid: sessions dir.
- **Profile**: a pi-profile config set. A column on each row; not a filter. Avoid: account.
- **Target worktree**: the git worktree where a resumed session starts. Never the repo top level.
