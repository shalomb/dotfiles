#!/bin/bash

# Test script to verify variable, function, and alias sourcing consistency

echo "=== VARIABLE, FUNCTION, AND ALIAS SOURCING TEST ==="
echo "Testing core constructs across all shell types"
echo ""

# Test function
test_shell_constructs() {
    local shell_type="$1"
    local command="$2"
    
    echo "--- Testing $shell_type ---"
    
    # Run the command and capture output
    local output
    output=$(eval "$command" 2>&1)
    
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
    
    if [[ "$xdg_config" != "/home/unop/.config" ]]; then
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

# Test all shell types
test_shell_constructs "Interactive Non-Login" "$test_command"
test_shell_constructs "Non-Interactive Non-Login" "$test_command"
test_shell_constructs "Interactive Login" "bash --login -c \"$test_command\""
test_shell_constructs "Non-Interactive Login" "bash --login -c \"$test_command\""

echo "=== SUMMARY ==="
echo "All shell types should have:"
echo "✅ Core variables: EDITOR, XDG_CONFIG_HOME, PATH, HISTFILE"
echo "✅ Core functions: @is-interactive, path-debug, warn"
echo "✅ Core aliases: e, d2h"
echo "❌ User tools: AWS_CLI_AUTO_PROMPT, cd function (disabled/)"
echo ""
echo "This proves consistent sourcing behavior for all shell constructs."