#!/usr/bin/env bash
# Test that EDITOR is properly set
# Modern bashisms, parameter expansions, proper error handling
# Quality standards: greycat/greg approved

# Colors using tput (portable, modern)
readonly RED="$(tput setaf 1 2>/dev/null || echo '')"
readonly GREEN="$(tput setaf 2 2>/dev/null || echo '')"
readonly YELLOW="$(tput setaf 3 2>/dev/null || echo '')"
readonly BLUE="$(tput setaf 4 2>/dev/null || echo '')"
readonly BOLD="$(tput bold 2>/dev/null || echo '')"
readonly RESET="$(tput sgr0 2>/dev/null || echo '')"

# Test configuration
readonly REPO_ROOT="$(dirname "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")")"
readonly BASH_CONFIG_DIR="$REPO_ROOT/.config/bash"
readonly BASH_RC="$BASH_CONFIG_DIR/bashrc"

# Test counters
declare -i tests_run=0
declare -i tests_passed=0
declare -i tests_failed=0

# Simple test function
test_function() {
    local -r test_name="$1"
    local -r test_command="$2"
    
    ((++tests_run))
    printf '%sRunning: %s%s\n' "$BLUE" "$test_name" "$RESET"
    
    if eval "$test_command" >/dev/null 2>&1; then
        printf '%s✅ PASS: %s%s\n' "$GREEN" "$test_name" "$RESET"
        ((++tests_passed))
        return 0
    else
        printf '%s❌ FAIL: %s%s\n' "$RED" "$test_name" "$RESET"
        ((++tests_failed))
        return 1
    fi
}

# Test: EDITOR is set after sourcing bashrc
test_editor_is_set() {
    local -r test_script="$(mktemp)"
    cat > "$test_script" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Create isolated environment
export HOME="$(mktemp -d)"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_STATE_HOME="$HOME/.local/state"

# Create necessary directories and files
mkdir -p "$HOME/.config/bash/enabled"
mkdir -p "$HOME/.config/bash/tools"
mkdir -p "$HOME/.ssh"
mkdir -p "$HOME/.gnupg"

touch "$HOME/.config/bash/enabled/dummy.sh"
cat > "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh" << 'INNER_EOF'
#!/usr/bin/env bash
bootstrap_ssh_agent() { echo "Mock SSH agent bootstrap"; }
export -f bootstrap_ssh_agent
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Source bashrc
source "$1" >/dev/null 2>&1

# Test EDITOR is set
[[ -n "${EDITOR:-}" ]] || exit 1
[[ -n "${FCEDIT:-}" ]] || exit 1

# Test EDITOR is a valid command
command -v "$EDITOR" >/dev/null 2>&1 || exit 1

echo "SUCCESS: EDITOR is set to '$EDITOR'"

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "EDITOR is set" "$test_script '$BASH_RC'"
    
    rm -f "$test_script"
}

# Test: EDITOR fallback works when no editors are available
test_editor_fallback() {
    local -r test_script="$(mktemp)"
    cat > "$test_script" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Create isolated environment with no editors
export HOME="$(mktemp -d)"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_STATE_HOME="$HOME/.local/state"

# Create necessary directories and files
mkdir -p "$HOME/.config/bash/enabled"
mkdir -p "$HOME/.config/bash/tools"
mkdir -p "$HOME/.ssh"
mkdir -p "$HOME/.gnupg"

touch "$HOME/.config/bash/enabled/dummy.sh"
cat > "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh" << 'INNER_EOF'
#!/usr/bin/env bash
bootstrap_ssh_agent() { echo "Mock SSH agent bootstrap"; }
export -f bootstrap_ssh_agent
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Remove all editors from PATH
export PATH="/bin:/usr/bin"

# Source bashrc
source "$1" >/dev/null 2>&1

# Test EDITOR is set to fallback
[[ "${EDITOR:-}" == "vi" ]] || exit 1
[[ "${FCEDIT:-}" == "vi" ]] || exit 1

echo "SUCCESS: EDITOR fallback works"

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "EDITOR fallback works" "$test_script '$BASH_RC'"
    
    rm -f "$test_script"
}

# Print test summary
print_test_summary() {
    printf '\n'
    printf '========================================\n'
    printf '%sTest Summary%s\n' "$BLUE" "$RESET"
    printf '========================================\n'
    printf 'Tests run: %d\n' "$tests_run"
    printf 'Tests passed: %s%d%s\n' "$GREEN" "$tests_passed" "$RESET"
    printf 'Tests failed: %s%d%s\n' "$RED" "$tests_failed" "$RESET"
    
    if ((tests_failed == 0)); then
        printf '%sAll tests passed! 🎉%s\n' "$GREEN" "$RESET"
        return 0
    else
        printf '%sSome tests failed! 😞%s\n' "$RED" "$RESET"
        return 1
    fi
}

# Main test runner
main() {
    printf '%sRunning EDITOR configuration tests%s\n' "$BLUE" "$RESET"
    printf 'Repository root: %s\n' "$REPO_ROOT"
    printf 'Bash config dir: %s\n' "$BASH_CONFIG_DIR"
    printf 'Bashrc file: %s\n' "$BASH_RC"
    printf '\n'
    
    # Run all tests
    test_editor_is_set
    test_editor_fallback
    
    print_test_summary
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi