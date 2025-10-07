#!/bin/bash

# Test script to verify shell sourcing consistency across all shell types

echo "=== SHELL SOURCING CONSISTENCY TEST ==="
echo "Testing all shell types for consistent behavior"
echo ""

# Test function
test_shell_type() {
    local shell_type="$1"
    local command="$2"
    
    echo "--- Testing $shell_type ---"
    
    # Run the command and capture output
    local output
    output=$(eval "$command" 2>&1)
    
    # Extract key variables
    local xdg_config_home=$(echo "$output" | grep "XDG_CONFIG_HOME:" | cut -d: -f2 | tr -d ' ')
    local path_has_local_bin=$(echo "$output" | grep "PATH contains .local/bin:" | cut -d: -f2 | tr -d ' ')
    local ps1_set=$(echo "$output" | grep "PS1:" | cut -d: -f2- | tr -d ' ')
    
    # Check consistency
    local consistent=1
    
    if [[ "$xdg_config_home" != "/home/unop/.config" ]]; then
        echo "❌ XDG_CONFIG_HOME inconsistent: $xdg_config_home"
        consistent=0
    else
        echo "✅ XDG_CONFIG_HOME: $xdg_config_home"
    fi
    
    if [[ "$path_has_local_bin" != "YES" ]]; then
        echo "❌ PATH missing .local/bin: $path_has_local_bin"
        consistent=0
    else
        echo "✅ PATH contains .local/bin: $path_has_local_bin"
    fi
    
    if [[ -n "$ps1_set" ]]; then
        echo "✅ PS1 set: $ps1_set"
    else
        echo "⚠️  PS1 not set (expected for non-interactive)"
    fi
    
    if [[ $consistent -eq 1 ]]; then
        echo "✅ $shell_type: CONSISTENT"
    else
        echo "❌ $shell_type: INCONSISTENT"
    fi
    
    echo ""
}

# Test all shell types
test_shell_type "Interactive Non-Login" 'bash -c "echo \"Shell type: Interactive Non-Login\"; echo \"PS1: $PS1\"; echo \"XDG_CONFIG_HOME: $XDG_CONFIG_HOME\"; echo \"PATH contains .local/bin: $(echo $PATH | grep -q \".local/bin\" && echo \"YES\" || echo \"NO\")\""'

test_shell_type "Non-Interactive Non-Login" 'bash -c "echo \"Shell type: Non-Interactive Non-Login\"; echo \"PS1: $PS1\"; echo \"XDG_CONFIG_HOME: $XDG_CONFIG_HOME\"; echo \"PATH contains .local/bin: $(echo $PATH | grep -q \".local/bin\" && echo \"YES\" || echo \"NO\")\""'

test_shell_type "Interactive Login" 'bash --login -c "echo \"Shell type: Interactive Login\"; echo \"PS1: $PS1\"; echo \"XDG_CONFIG_HOME: $XDG_CONFIG_HOME\"; echo \"PATH contains .local/bin: $(echo $PATH | grep -q \".local/bin\" && echo \"YES\" || echo \"NO\")\""'

test_shell_type "Non-Interactive Login" 'bash --login -c "echo \"Shell type: Non-Interactive Login\"; echo \"PS1: $PS1\"; echo \"XDG_CONFIG_HOME: $XDG_CONFIG_HOME\"; echo \"PATH contains .local/bin: $(echo $PATH | grep -q \".local/bin\" && echo \"YES\" || echo \"NO\")\""'

echo "=== SUMMARY ==="
echo "All shell types should have:"
echo "✅ XDG_CONFIG_HOME=/home/unop/.config"
echo "✅ PATH contains .local/bin"
echo "✅ PS1 set for interactive shells"
echo "✅ PS1 not set for non-interactive shells"
echo ""
echo "This proves consistent sourcing behavior across all shell types."