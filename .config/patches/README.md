# Application Patches

This directory contains patches for various applications that have known issues or bugs.

## Available Patches

### cursor-agent-patch
Fixes `agent` / cursor-agent Shell harness noise (`dump_bash_state` / `eval: - : invalid option`).

**Files:**
- `cursor-agent/` - Python-based patch system directory
  - `patch.py` - Main Python implementation (robust, precise)
  - `cursor-agent-patch.sh` - Shell wrapper script
  - `pyproject.toml` - Python project configuration
  - `README.md` - Detailed documentation

**Usage:**
```bash
# List available patches
make patch

# Apply / status / restore one patch
make patch APP=cursor-agent
make patch APP=cursor-agent ACTION=status
make patch APP=cursor-agent ACTION=restore

# Run the same action across every discovered patch
make patch APP=all
make patch APP=all ACTION=status

# Or invoke the wrapper directly
.config/patches/cursor-agent/cursor-agent-patch.sh apply
.config/patches/cursor-agent/cursor-agent-patch.sh status
.config/patches/cursor-agent/cursor-agent-patch.sh restore
```

**Features:**
- **Robust Python implementation**: Uses precise regex pattern matching
- **Safe operations**: No risk of corrupting JavaScript code
- **Automatic installation detection**: Finds all cursor-agent installations
- **Backup creation**: Creates backups before patching
- **Comprehensive testing**: Basic functionality tests after patching
- **Error handling**: Graceful failure recovery
- **Type safety**: Full Python type hints and validation
- **Color-coded output**: Clear status messages

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