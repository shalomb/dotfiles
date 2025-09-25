#!/bin/bash
set -e

# Cursor Agent Bash Initialization Patch Helper
# Adds `G8n+` prefix to bash command execution to ensure proper bash initialization

AGENT_DIR="$1"

echo "Patching cursor-agent in: $AGENT_DIR"

# Check if we're in the right directory
if [ ! -f "$AGENT_DIR/index.js" ]; then
    echo "Error: index.js not found in $AGENT_DIR"
    exit 1
fi

# Create backup if it doesn't exist
if [ ! -f "$AGENT_DIR/index.js.original" ]; then
    cp "$AGENT_DIR/index.js" "$AGENT_DIR/index.js.original"
    echo "Created backup: index.js.original"
fi

# Apply patch (idempotent)
sed -i 's/let s=\["-O","extglob","-c",`snap=/let s=["-O","extglob","-c",G8n+`snap=/' "$AGENT_DIR/index.js"

# Verify patch
if grep -q 'G8n+`snap=' "$AGENT_DIR/index.js"; then
    echo "✓ Patch applied successfully"
else
    echo "✗ Patch failed"
    exit 1
fi

# Basic tests
echo "Running basic tests..."
cd "$AGENT_DIR"

# Test 1: Check if cursor-agent runs without immediate errors
echo "Test 1: Basic startup test"
timeout 5s ./cursor-agent --help >/dev/null 2>&1 && echo "✓ Startup test passed" || echo "✗ Startup test failed"

# Test 2: Test shell command execution
echo "Test 2: Shell command test"
timeout 10s ./cursor-agent -p --force "run echo test" >/dev/null 2>&1 && echo "✓ Shell command test passed" || echo "✗ Shell command test failed"

echo "Patch complete!"
