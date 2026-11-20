# Glossary: /doc system

**Shadow scratch**:
A note file kept outside the git tree, tied to one repo and one worktree.
_Avoid_: temp note, tmp file

**Scratch store**:
The directory `~/.cache/agent-skills/scratch/<repo-slug>/` that holds all shadow scratch notes of one repo.
_Avoid_: scratch dir, notes folder

**Document library**:
The doc root that holds filed documents and `index.json`.
_Avoid_: doc store

**Landing state**:
The search page state with a centred search box and a visible legend.
_Avoid_: idle mode, home mode

**Docked state**:
The search page state after a non-empty query: the search box sticks to the top and the legend folds away.
_Avoid_: active mode, search mode
