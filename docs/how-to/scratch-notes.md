# How to keep scratch notes outside the git tree

Shadow scratch is a per-worktree notes store that lives outside the repo.
Notes never show in `git status` and cannot be committed by mistake.
Decision: [ADR-014](../architecture/ADR-014-shadow-scratch-store-outside-git-tree.md).
Slice context: [handoff-slice-1](../specs/doc-system/handoff-slice-1.md).

## Store path

```
~/.cache/agent-skills/scratch/<repo-slug>/<worktree>/<name>.md
```

- `<repo-slug>`: the last part of `remote.origin.url`, without `.git`.
  If the repo has no remote, the slug is the repo directory name.
- `<worktree>`: the directory name of the current worktree.
- `<name>`: the note name. The default is `notes`.
- To use a different store, set `SCRATCH_ROOT`.

## Commands

```bash
scratch [name]        # open the note in $VISUAL or $EDITOR (default: vi)
scratch list          # list the notes of this worktree, then orphans
scratch path [name]   # print the note path
```

- `scratch` creates the note and its directories if they do not exist.
- A note name must not contain `/` or start with `.`.
- Run the commands from inside a git repository.

## Agents: use `scratch path`

Agents write scratch content to the path that `scratch path` prints.
They do not write to the repo tree.

```bash
note="$(scratch path plan)"
printf '%s\n' 'step 1: check the tests' >> "$note"
```

The parent directory exists only after `scratch [name]` has run once.
Run `mkdir -p "$(dirname "$note")"` before the first write.

## Orphans

An orphan is a note whose worktree no longer exists.
`scratch list` prints each orphan as a tab-separated line:

```
<name>    orphan    <worktree>    <path>
```

Read the orphan note, move what you need, then delete the directory by hand.
`scratch` never deletes notes.

## Undo history in Neovim (optional)

The store is outside `/tmp`, so Neovim undo files survive reboots.
The CLI does not set any Neovim option. To keep undo history, add this to
your Neovim config:

```vim
set undofile
set undodir=~/.local/state/nvim/undo//
```

## Deploy

Run `export` from the main checkout only, not from a linked worktree:

```bash
cd ~/.config/dotfiles && uv run python -m dotfile_manager export .local/bin/scratch
```
