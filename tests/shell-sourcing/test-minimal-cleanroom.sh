#!/bin/bash

# Minimal cleanroom test using Podman
set -euo pipefail

echo "=== MINIMAL CLEANROOM TEST ==="
echo "Testing core variables in isolated environment"
echo ""

CONTAINER_NAME="dotfiles-minimal-test-$(date +%s)"
IMAGE="ubuntu:22.04"

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    podman rm -f "$CONTAINER_NAME" 2>/dev/null || true
}
trap cleanup EXIT

# Create container
echo "Creating container..."
podman run -d --name "$CONTAINER_NAME" "$IMAGE" sleep 300

# Install bash
echo "Installing bash..."
podman exec "$CONTAINER_NAME" bash -c "apt-get update -qq && apt-get install -y -qq bash vim nano"

# Copy dotfiles
echo "Copying dotfiles..."
podman cp . "$CONTAINER_NAME:/tmp/dotfiles"

# Set up dotfiles as root (simpler)
echo "Setting up dotfiles..."
podman exec "$CONTAINER_NAME" bash -c "
    cd /tmp/dotfiles
    cp -r .config /root/
    ln -sf /root/.config/bash/bashrc /root/.bashrc
    ln -sf /root/.config/bash/profile /root/.bash_profile
    ln -sf /root/.config/bash/profile /root/.profile
"

# Test function
test_shell() {
    local shell_type="$1"
    local command="$2"
    
    echo "--- Testing $shell_type ---"
    
    local output
    output=$(podman exec "$CONTAINER_NAME" bash -c "$command" 2>&1)
    
    # Check key variables
    local editor=$(echo "$output" | grep "EDITOR:" | cut -d: -f2 | tr -d ' ')
    local xdg_config=$(echo "$output" | grep "XDG_CONFIG_HOME:" | cut -d: -f2 | tr -d ' ')
    local path_has_local=$(echo "$output" | grep "PATH contains .local/bin:" | cut -d: -f2 | tr -d ' ')
    
    # Check functions
    local is_interactive=$(echo "$output" | grep "is-interactive function:" | cut -d: -f2 | tr -d ' ')
    local path_debug=$(echo "$output" | grep "path-debug function:" | cut -d: -f2 | tr -d ' ')
    
    # Check aliases
    local e_alias=$(echo "$output" | grep "alias e:" | cut -d: -f2 | tr -d ' ')
    
    # Results
    echo "EDITOR: ${editor:-NOT SET}"
    echo "XDG_CONFIG_HOME: ${xdg_config:-NOT SET}"
    echo "PATH contains .local/bin: ${path_has_local:-NOT SET}"
    echo "is-interactive function: ${is_interactive:-NOT SET}"
    echo "path-debug function: ${path_debug:-NOT SET}"
    echo "alias e: ${e_alias:-NOT SET}"
    
    # Check consistency
    local consistent=1
    if [[ -z "$editor" ]]; then consistent=0; fi
    if [[ "$xdg_config" != "/root/.config" ]]; then consistent=0; fi
    if [[ "$path_has_local" != "YES" ]]; then consistent=0; fi
    if [[ "$is_interactive" != "YES" ]]; then consistent=0; fi
    if [[ "$path_debug" != "YES" ]]; then consistent=0; fi
    if [[ "$e_alias" != "YES" ]]; then consistent=0; fi
    
    if [[ $consistent -eq 1 ]]; then
        echo "✅ $shell_type: CONSISTENT"
    else
        echo "❌ $shell_type: INCONSISTENT"
    fi
    echo ""
}

# Test command
test_cmd='bash -c "
echo \"EDITOR: $EDITOR\"
echo \"XDG_CONFIG_HOME: $XDG_CONFIG_HOME\"
echo \"PATH contains .local/bin: $(echo $PATH | grep -q \".local/bin\" && echo \"YES\" || echo \"NO\")\"
echo \"is-interactive function: $(type -t @is-interactive >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
echo \"path-debug function: $(type -t path-debug >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
echo \"alias e: $(alias e >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
"'

# Run tests
test_shell "Interactive Non-Login" "$test_cmd"
test_shell "Interactive Login" "bash --login -c \"$test_cmd\""

echo "=== CLEANROOM TEST COMPLETE ==="

# Cleanup
cleanup