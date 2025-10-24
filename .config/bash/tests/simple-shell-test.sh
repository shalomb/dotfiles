#!/usr/bin/env bash
# Simple Shell Login Test
# Tests shell functionality without breaking the actual environment
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

# Test: bashrc file exists and is readable
test_bashrc_file_exists() {
    test_function "bashrc exists" "[[ -f '$BASH_RC' ]]"
}

# Test: bashrc has proper shebang
test_bashrc_shebang() {
    test_function "bashrc has proper shebang" "head -n1 '$BASH_RC' | grep -q '#!/usr/bin/env bash'"
}

# Test: bashrc has valid syntax
test_bashrc_syntax() {
    test_function "bashrc has valid syntax" "bash -n '$BASH_RC'"
}

# Test: bashrc sources without errors in isolated environment
test_bashrc_sources_cleanly() {
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

# Create necessary directories
mkdir -p "$HOME/.config/bash/enabled"
mkdir -p "$HOME/.config/bash/tools"
mkdir -p "$HOME/.ssh"
mkdir -p "$HOME/.gnupg"

# Create minimal required files
touch "$HOME/.config/bash/enabled/dummy.sh"
cat > "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh" << 'INNER_EOF'
#!/usr/bin/env bash
    echo "Mock SSH agent bootstrap"
}
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Source bashrc
source "$1" >/dev/null 2>&1

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "bashrc sources cleanly" "$test_script '$BASH_RC'"
    
    rm -f "$test_script"
}

# Test: environment variables are properly set
test_environment_variables_set() {
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
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Source bashrc
source "$1" >/dev/null 2>&1

# Test XDG variables
[[ -n "${XDG_CONFIG_HOME:-}" ]] || exit 1
[[ -n "${XDG_CACHE_HOME:-}" ]] || exit 1
[[ -n "${XDG_DATA_HOME:-}" ]] || exit 1
[[ -n "${XDG_STATE_HOME:-}" ]] || exit 1

# Test GPG_TTY is set
[[ -n "${GPG_TTY:-}" ]] || exit 1

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "environment variables set" "$test_script '$BASH_RC'"
    
    rm -f "$test_script"
}

# Test: history configuration is properly set
test_history_configuration() {
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
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Source bashrc
source "$1" >/dev/null 2>&1

# Test history variables
[[ -n "${HISTFILE:-}" ]] || exit 1
[[ -n "${HISTFILESIZE:-}" ]] || exit 1
[[ -n "${HISTSIZE:-}" ]] || exit 1
[[ -n "${HISTCONTROL:-}" ]] || exit 1
[[ -n "${HISTIGNORE:-}" ]] || exit 1
[[ -n "${HISTTIMEFORMAT:-}" ]] || exit 1

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "history configuration set" "$test_script '$BASH_RC'"
    
    rm -f "$test_script"
}

# Test: prompt is set
test_prompt_is_set() {
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
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Source bashrc
source "$1" >/dev/null 2>&1

# Test PS1 is set
[[ -n "${PS1:-}" ]] || exit 1

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "prompt is set" "$test_script '$BASH_RC'"
    
    rm -f "$test_script"
}

# Test: bashrc handles non-interactive mode gracefully
test_non_interactive_handling() {
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
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Test that bashrc doesn't fail in non-interactive mode
source "$1" >/dev/null 2>&1

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "non-interactive handling" "$test_script '$BASH_RC'"
    
    rm -f "$test_script"
}

# Test: bashrc performance (should load quickly)
test_bashrc_performance() {
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
INNER_EOF
chmod +x "$HOME/.config/bash/tools/ssh-agent-bootstrap.sh"

# Measure loading time
start_time="$(date +%s%N)"
source "$1" >/dev/null 2>&1
end_time="$(date +%s%N)"
duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

# Should load in less than 1000ms
((duration < 1000)) || exit 1

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    test_function "bashrc performance" "$test_script '$BASH_RC'"
    
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
    printf '%sRunning simple shell login tests%s\n' "$BLUE" "$RESET"
    printf 'Repository root: %s\n' "$REPO_ROOT"
    printf 'Bash config dir: %s\n' "$BASH_CONFIG_DIR"
    printf 'Bashrc file: %s\n' "$BASH_RC"
    printf '\n'
    
    # Run all tests
    test_bashrc_file_exists
    test_bashrc_shebang
    test_bashrc_syntax
    test_bashrc_sources_cleanly
    test_environment_variables_set
    test_history_configuration
    test_prompt_is_set
    test_non_interactive_handling
    test_bashrc_performance
    
    print_test_summary
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi