# Glossary: /worktree

**Worktree**:
A linked git checkout under `<repo>/.worktrees/<dir>`, made by the using-git-worktrees convention.
_Avoid_: workspace, sandbox

**Origin checkout**:
The directory that pi used when the user ran `/worktree`.
_Avoid_: main dir, parent dir

**Hop**:
The change of the pi session from the origin checkout to a worktree.
_Avoid_: jump, switch

**Session cwd**:
The directory stored in the session header. Tools and cwd-bound services use it.
