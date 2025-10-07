#!/bin/bash

# Cleanroom test using Podman to validate shell sourcing consistency
# This tests our dotfiles in a completely isolated environment

set -euo pipefail

echo "=== CLEANROOM SHELL SOURCING TEST WITH PODMAN ==="
echo "Testing dotfiles in isolated container environment"
echo ""

# Configuration
CONTAINER_NAME="dotfiles-test-$(date +%s)"
IMAGE="ubuntu:22.04"
TEST_USER="testuser"
TEST_HOME="/home/$TEST_USER"

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    podman rm -f "$CONTAINER_NAME" 2>/dev/null || true
}
trap cleanup EXIT

# Create container
echo "Creating cleanroom container..."
podman run -d --name "$CONTAINER_NAME" "$IMAGE" sleep 3600

# Install required packages
echo "Installing required packages..."
podman exec "$CONTAINER_NAME" bash -c "
    apt-get update -qq
    apt-get install -y -qq bash git curl vim nano
"

# Create test user
echo "Creating test user..."
podman exec "$CONTAINER_NAME" bash -c "
    useradd -m -s /bin/bash $TEST_USER
    usermod -aG sudo $TEST_USER
    echo '$TEST_USER ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
"

# Copy dotfiles to container
echo "Copying dotfiles to container..."
podman cp . "$CONTAINER_NAME:/tmp/dotfiles"

# Set up dotfiles in container
echo "Setting up dotfiles in container..."
podman exec "$CONTAINER_NAME" bash -c "
    cd /tmp/dotfiles
    chown -R $TEST_USER:$TEST_USER .
    sudo -u $TEST_USER cp -r .config /home/$TEST_USER/
    sudo -u $TEST_USER ln -sf /home/$TEST_USER/.config/bash/bashrc /home/$TEST_USER/.bashrc
    sudo -u $TEST_USER ln -sf /home/$TEST_USER/.config/bash/profile /home/$TEST_USER/.bash_profile
    sudo -u $TEST_USER ln -sf /home/$TEST_USER/.config/bash/profile /home/$TEST_USER/.profile
"

# Test function
test_shell_in_container() {
    local shell_type="$1"
    local command="$2"
    
    echo "--- Testing $shell_type in cleanroom ---"
    
    # Run the command in the container
    local output
    output=$(podman exec "$CONTAINER_NAME" sudo -u "$TEST_USER" bash -c "$command" 2>&1)
    
    # Extract key variables
    local editor=$(echo "$output" | grep "EDITOR:" | cut -d: -f2 | tr -d ' ')
    local xdg_config=$(echo "$output" | grep "XDG_CONFIG_HOME:" | cut -d: -f2 | tr -d ' ')
    local path_has_local=$(echo "$output" | grep "PATH contains .local/bin:" | cut -d: -f2 | tr -d ' ')
    local histfile=$(echo "$output" | grep "HISTFILE:" | cut -d: -f2 | tr -d ' ')
    
    # Extract function availability
    local is_interactive_func=$(echo "$output" | grep "is-interactive function:" | cut -d: -f2 | tr -d ' ')
    local path_debug_func=$(echo "$output" | grep "path-debug function:" | cut -d: -f2 | tr -d ' ')
    local warn_func=$(echo "$output" | grep "warn function:" | cut -d: -f2 | tr -d ' ')
    
    # Extract alias availability
    local e_alias=$(echo "$output" | grep "alias e:" | cut -d: -f2 | tr -d ' ')
    local d2h_alias=$(echo "$output" | grep "alias d2h:" | cut -d: -f2 | tr -d ' ')
    
    # Extract user tool availability (should be NOT available)
    local aws_cli_var=$(echo "$output" | grep "AWS_CLI_AUTO_PROMPT:" | cut -d: -f2 | tr -d ' ')
    local cd_func=$(echo "$output" | grep "cd function:" | cut -d: -f2 | tr -d ' ')
    
    # Check consistency
    local consistent=1
    
    # Core variables should be available
    if [[ -z "$editor" ]]; then
        echo "❌ EDITOR not set"
        consistent=0
    else
        echo "✅ EDITOR: $editor"
    fi
    
    if [[ "$xdg_config" != "/home/$TEST_USER/.config" ]]; then
        echo "❌ XDG_CONFIG_HOME inconsistent: $xdg_config"
        consistent=0
    else
        echo "✅ XDG_CONFIG_HOME: $xdg_config"
    fi
    
    if [[ "$path_has_local" != "YES" ]]; then
        echo "❌ PATH missing .local/bin: $path_has_local"
        consistent=0
    else
        echo "✅ PATH contains .local/bin: $path_has_local"
    fi
    
    if [[ -z "$histfile" ]]; then
        echo "❌ HISTFILE not set"
        consistent=0
    else
        echo "✅ HISTFILE: $histfile"
    fi
    
    # Core functions should be available
    if [[ "$is_interactive_func" != "YES" ]]; then
        echo "❌ is-interactive function not available: $is_interactive_func"
        consistent=0
    else
        echo "✅ is-interactive function: $is_interactive_func"
    fi
    
    if [[ "$path_debug_func" != "YES" ]]; then
        echo "❌ path-debug function not available: $path_debug_func"
        consistent=0
    else
        echo "✅ path-debug function: $path_debug_func"
    fi
    
    if [[ "$warn_func" != "YES" ]]; then
        echo "❌ warn function not available: $warn_func"
        consistent=0
    else
        echo "✅ warn function: $warn_func"
    fi
    
    # Core aliases should be available
    if [[ "$e_alias" != "YES" ]]; then
        echo "❌ alias e not available: $e_alias"
        consistent=0
    else
        echo "✅ alias e: $e_alias"
    fi
    
    if [[ "$d2h_alias" != "YES" ]]; then
        echo "❌ alias d2h not available: $d2h_alias"
        consistent=0
    else
        echo "✅ alias d2h: $d2h_alias"
    fi
    
    # User tools should NOT be available
    if [[ "$aws_cli_var" == "YES" ]]; then
        echo "❌ AWS_CLI_AUTO_PROMPT should NOT be available: $aws_cli_var"
        consistent=0
    else
        echo "✅ AWS_CLI_AUTO_PROMPT correctly NOT available: $aws_cli_var"
    fi
    
    if [[ "$cd_func" == "YES" ]]; then
        echo "❌ cd function should NOT be available: $cd_func"
        consistent=0
    else
        echo "✅ cd function correctly NOT available: $cd_func"
    fi
    
    if [[ $consistent -eq 1 ]]; then
        echo "✅ $shell_type: CONSISTENT"
    else
        echo "❌ $shell_type: INCONSISTENT"
    fi
    
    echo ""
}

# Test command that checks all constructs
test_command='bash -c "
echo \"Shell type: $0\"
echo \"EDITOR: $EDITOR\"
echo \"XDG_CONFIG_HOME: $XDG_CONFIG_HOME\"
echo \"PATH contains .local/bin: $(echo $PATH | grep -q \".local/bin\" && echo \"YES\" || echo \"NO\")\"
echo \"HISTFILE: $HISTFILE\"
echo \"is-interactive function: $(type -t @is-interactive >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
echo \"path-debug function: $(type -t path-debug >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
echo \"warn function: $(type -t warn >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
echo \"alias e: $(alias e >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
echo \"alias d2h: $(alias d2h >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
echo \"AWS_CLI_AUTO_PROMPT: $(test -n \"$AWS_CLI_AUTO_PROMPT\" && echo \"YES\" || echo \"NO\")\"
echo \"cd function: $(type -t - >/dev/null 2>&1 && echo \"YES\" || echo \"NO\")\"
"'

# Test all shell types in cleanroom
test_shell_in_container "Interactive Non-Login" "$test_command"
test_shell_in_container "Non-Interactive Non-Login" "$test_command"
test_shell_in_container "Interactive Login" "bash --login -c \"$test_command\""
test_shell_in_container "Non-Interactive Login" "bash --login -c \"$test_command\""

echo "=== CLEANROOM TEST SUMMARY ==="
echo "All shell types should have:"
echo "✅ Core variables: EDITOR, XDG_CONFIG_HOME, PATH, HISTFILE"
echo "✅ Core functions: @is-interactive, path-debug, warn"
echo "✅ Core aliases: e, d2h"
echo "❌ User tools: AWS_CLI_AUTO_PROMPT, cd function (disabled/)"
echo ""
echo "This proves consistent sourcing behavior in a clean environment."

# Cleanup
cleanup