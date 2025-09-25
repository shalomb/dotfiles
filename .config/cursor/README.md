# Cursor Agent Configuration

This directory contains the configuration for Cursor's AI agent functionality.

## Files

- `cli-config.json` - Main configuration file with permissions, model settings, and editor preferences
- `auth.json.template` - Template for authentication tokens (copy to `auth.json` and fill in your tokens)
- `prompt_history.json` - History of prompts (managed by Cursor, don't edit manually)

## Configuration Details

### Permissions
The `cli-config.json` file defines what the Cursor agent is allowed to do:
- **Shell commands**: Various git, system, and development tools
- **File writes**: Specific directories and file patterns the agent can modify
- **Privacy settings**: Ghost mode and privacy levels

### Model Settings
- **Model**: Auto-selection (default)
- **Vim Mode**: Disabled
- **Network**: HTTP/2 for agent communication

## Deployment

To deploy your cursor configuration:

```bash
# Deploy just cursor config
make install TARGET=.config/cursor

# Or deploy all configs including cursor
make install TARGET=.config
```

## Security Note

The `auth.json` file contains sensitive authentication tokens. It's excluded from version control for security reasons. Use the template file to set up your authentication.

## Cursor Agent Bash Fix

The repository includes a fix for a known bash initialization issue in cursor-agent. See `.config/patches/README.md` for details.

**Quick usage:**
```bash
# Apply the bash initialization fix
make patch APP=cursor-agent

# Check if the fix is applied
.config/patches/cursor-agent-bash-fix.sh status
```

## Customization

You can modify `cli-config.json` to:
- Add or remove shell command permissions
- Change file write permissions
- Adjust privacy settings
- Modify model preferences

After making changes, redeploy with:
```bash
make install TARGET=.config/cursor
```