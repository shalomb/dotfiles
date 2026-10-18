# How to adopt files from $HOME into the repo

```bash
uv run python -m dotfile_manager import .pi/agent/
```

- Files become **hardlinks** into the repo (same inode as in `$HOME`);
  symlinks are recreated as symlinks. If hardlinking fails (different
  filesystem) the file is copied and a warning is logged.
- Directories are walked file by file; paths matching `[import] exclude`
  in `.dotfiles.toml` are skipped. This repo is public, so keep secrets
  and state there (e.g. `auth.json`, `sessions/`).
- A path that matches nothing is an error (non-zero exit).

Review with `git status` before committing.
