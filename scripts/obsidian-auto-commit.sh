#!/bin/bash
# Obsidian auto-commit script for crontab
# Commits all work as WIP commit every 4 hours if there are changes

set -euo pipefail

OBSIDIAN_DIR="$HOME/obsidian"
LOG_FILE="${XDG_CACHE_HOME:-$HOME/.cache}/obsidian-auto-commit.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" >> "$LOG_FILE"
}

# Check if obsidian directory exists
if [[ ! -d "$OBSIDIAN_DIR" ]]; then
    log "ERROR: Obsidian directory not found: $OBSIDIAN_DIR"
    exit 1
fi

# Change to obsidian directory
cd "$OBSIDIAN_DIR" || {
    log "ERROR: Cannot change to directory: $OBSIDIAN_DIR"
    exit 1
}

# Check if this is a git repository
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log "ERROR: Not a git repository: $OBSIDIAN_DIR"
    exit 1
fi

# Check for uncommitted changes
if git diff --quiet && git diff --cached --quiet; then
    # No changes, exit early
    log "INFO: No uncommitted changes, skipping commit"
    exit 0
fi

# Add all changes
git add -A

# Check if there are staged changes after adding
if git diff --cached --quiet; then
    log "INFO: No changes to commit after staging"
    exit 0
fi

# Create WIP commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="WIP: Auto-commit at $TIMESTAMP

Auto-committed by crontab job
- All uncommitted changes staged
- Timestamp: $TIMESTAMP"

# Commit the changes
if git commit -m "$COMMIT_MSG"; then
    log "SUCCESS: WIP commit created at $TIMESTAMP"
else
    log "ERROR: Failed to create commit"
    exit 1
fi

# Optional: Push to remote (uncomment if desired)
# if git push origin main 2>/dev/null; then
#     log "SUCCESS: Pushed to remote"
# else
#     log "WARNING: Failed to push to remote (may not be configured)"
# fi

log "INFO: Obsidian auto-commit completed successfully"