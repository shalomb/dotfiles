# Agent Development Guidelines

## Git Commands Best Practices

When working with git commands in terminals, always use `--no-pager` to prevent output from being truncated or requiring interaction:

### Recommended Git Commands

```bash
# Check status
git --no-pager status

# View diffs
git --no-pager diff
git --no-pager diff HEAD cv/style.css

# View logs
git --no-pager log --oneline -10

# Show changes
git --no-pager show HEAD
```

### GitHub CLI Configuration

Set cat as the default pager for gh commands:

```bash
gh config set pager cat
```

## File Management

When working across multiple directories (e.g., git repos outside the main workspace), always consolidate changes back into the VS Code workspace to avoid "editing files outside workspace" warnings.

Use rsync to sync entire repositories:
```bash
rsync -av /source/repo/ /workspace/destination/
```

## Development Workflow

1. Always check current working directory and git status before making changes
2. Use `--no-pager` with git commands to see full output
3. Consolidate git repositories into the workspace when possible
4. Use live reload for development (`make dev` in CV project)
5. For CSS/styling changes, live reload automatically updates - no need to rebuild