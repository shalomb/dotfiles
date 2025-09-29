# Application Patches

This directory contains patches for various applications that have known issues or bugs.

## Available Patches

### cursor-agent-patch
Fixes bash initialization issues in cursor-agent by adding proper bash initialization prefix.

**Files:**
- `cursor-agent-patch.sh` - The consolidated patch script

**Usage:**
```bash
# Apply the patch (recommended)
make patch APP=cursor-agent

# Or apply directly
.config/patches/cursor-agent-patch.sh apply

# Check patch status
.config/patches/cursor-agent-patch.sh status

# Restore from backup
.config/patches/cursor-agent-patch.sh restore
```

**Features:**
- Automatically finds all cursor-agent installations
- Creates backups before patching
- Handles multiple versions gracefully
- Provides detailed status reporting
- Runs basic tests after patching
- Color-coded output for better UX

## Adding New Patches

To add a new patch:

1. Create a new directory: `.config/patches/your-app-name/`
2. Add your patch script with standard interface:
   - `apply` - Apply the patch
   - `status` - Check if patch is applied
   - `restore` - Restore from backup
3. Update this README with documentation
4. Test the patch thoroughly

## Patch Script Standards

All patch scripts should:
- Accept `apply`, `status`, `restore` commands
- Create backups before applying patches
- Provide clear status output
- Handle errors gracefully
- Be idempotent (safe to run multiple times)