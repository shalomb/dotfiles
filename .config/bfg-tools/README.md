# BFG Repo-Cleaner

BFG Repo-Cleaner is a simpler, faster alternative to `git filter-branch` for cleaning up bad data like big files or passwords from your Git repository history.

## Installation

The BFG wrapper script is automatically installed when you run:

```bash
make bfg-tools
# or
make tools  # includes bfg-tools
```

## Usage

### First-time setup

```bash
# Download the latest BFG JAR file
bfg --update
```

### Common operations

```bash
# Remove files larger than 50M
bfg --strip-blobs-bigger-than 50M

# Remove specific files
bfg --delete-files '*.{key,log,secret}'

# Remove specific folders
bfg --delete-folders 'logs,temp,cache'

# Replace text in files
bfg --replace-text replacements.txt

# Remove passwords (interactive)
bfg --replace-text <(echo 'password==>***REMOVED***')

# Show version
bfg --version
```

### After running BFG

BFG rewrites your repository history. After running BFG, you need to:

1. **Clean up**: `git reflog expire --expire=now --all && git gc --prune=now --aggressive`
2. **Force push**: `git push origin --force --all`
3. **Update clones**: All team members need to re-clone the repository

## Configuration

### Environment Variables

- `BFG_VERSION`: Specific version to use (default: latest)
- `BFG_DIR`: Directory to store BFG JAR (default: ~/.local/share/bfg)

### Example: Use specific version

```bash
BFG_VERSION=1.14.0 bfg --update
```

## Security Notes

⚠️ **Important**: BFG operations rewrite Git history and are destructive. Always:

1. **Backup your repository** before running BFG
2. **Test on a copy** first
3. **Coordinate with your team** - everyone needs to re-clone after force push
4. **Revoke any exposed credentials** immediately

## Targeted Cleanup

For sensitive data cleanup, you typically want to only rewrite history from the commit that introduced the secret, not the entire repository history.

### JIRA Token Cleanup Script

A one-time targeted cleanup script is available in `/tmp` for the current JIRA token exposure:

```bash
# Run the targeted cleanup script
/tmp/cleanup-jira-token.sh
```

This script:
- Identifies the commit that introduced the JIRA config file (`5115020`)
- Only rewrites history from that commit onwards (15 commits)
- Creates a backup branch before cleanup
- Removes the JIRA config file from history
- Provides clear next steps

**Note**: This is a temporary script in `/tmp` that will be automatically cleaned up by the system.

## Examples

### Remove sensitive files

```bash
# Remove common sensitive file patterns
bfg --delete-files '*.{key,pem,p12,pfx,secret,env}'

# Remove specific sensitive files
bfg --delete-files 'config.yaml,secrets.txt'
```

### Remove large files

```bash
# Remove files larger than 100MB
bfg --strip-blobs-bigger-than 100M

# Remove specific large files
bfg --delete-files 'large-video.mp4,huge-database.sql'
```

### Replace sensitive text

```bash
# Create replacements file
cat > replacements.txt << EOF
password==>***REMOVED***
api_key==>***REMOVED***
secret_token==>***REMOVED***
EOF

# Apply replacements
bfg --replace-text replacements.txt
```

### Clean up after BFG

```bash
# Complete cleanup
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push to remote
git push origin --force --all

# Notify team to re-clone
echo "Repository history has been rewritten. Please re-clone the repository."
```

## Troubleshooting

### Java not found

```bash
# Ubuntu/Debian
sudo apt install openjdk-11-jdk

# macOS
brew install openjdk@11
```

### BFG JAR corrupted

```bash
# Re-download
bfg --update
```

### Permission denied

```bash
# Make sure the script is executable
chmod +x ~/.local/bin/bfg
```

## Resources

- [BFG Repo-Cleaner GitHub](https://github.com/rtyley/bfg-repo-cleaner)
- [BFG Documentation](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git Filter-Branch vs BFG](https://rtyley.github.io/bfg-repo-cleaner/#filter-branch)