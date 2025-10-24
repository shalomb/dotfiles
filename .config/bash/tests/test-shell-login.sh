#!/usr/bin/env bash
# Robust Shell Login Testing
# Tests shell functionality without breaking the actual environment
# Modern bashisms, parameter expansions, proper error handling
# Quality standards: greycat/greg approved

# Source the test framework
source "$(dirname "${BASH_SOURCE[0]}")/test-framework.sh"

# Test configuration
readonly REPO_ROOT="$(dirname "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")")"
readonly BASH_CONFIG_DIR="$REPO_ROOT/.config/bash"
readonly BASH_RC="$BASH_CONFIG_DIR/bashrc"

# Test: bashrc file exists and is readable
test_bashrc_file_exists() {
    assert_file_exists "$BASH_RC" "bashrc file should exist in repository"
}

# Test: bashrc has proper shebang and syntax
test_bashrc_syntax() {
    # Check shebang
    local first_line
    first_line="$(head -n1 "$BASH_RC")"
    assert_contains "$first_line" "#!/usr/bin/env bash" "bashrc should have proper shebang"
    
    # Check syntax
    if bash -n "$BASH_RC" 2>/dev/null; then
        assert_success "bashrc should have valid syntax"
    else
        assert_failure "bashrc should have valid syntax"
    fi
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
if source "$1" >/dev/null 2>&1; then
    echo "SUCCESS: bashrc sourced without errors"
else
    echo "FAILURE: bashrc failed to source"
    exit 1
fi

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    if "$test_script" "$BASH_RC"; then
        assert_success "bashrc should source without errors in isolated environment"
    else
        assert_failure "bashrc should source without errors in isolated environment"
    fi
    
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

echo "SUCCESS: Environment variables set correctly"

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    if "$test_script" "$BASH_RC"; then
        assert_success "Environment variables should be set"
    else
        assert_failure "Environment variables should be set"
    fi
    
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

echo "SUCCESS: History configuration set correctly"

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    if "$test_script" "$BASH_RC"; then
        assert_success "History configuration should be set"
    else
        assert_failure "History configuration should be set"
    fi
    
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

echo "SUCCESS: Prompt is set correctly"

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    if "$test_script" "$BASH_RC"; then
        assert_success "Prompt should be set"
    else
        assert_failure "Prompt should be set"
    fi
    
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
if source "$1" >/dev/null 2>&1; then
    echo "SUCCESS: bashrc handles non-interactive mode gracefully"
else
    echo "FAILURE: bashrc failed in non-interactive mode"
    exit 1
fi

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    if "$test_script" "$BASH_RC"; then
        assert_success "bashrc should handle non-interactive mode gracefully"
    else
        assert_failure "bashrc should handle non-interactive mode gracefully"
    fi
    
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
if ((duration < 1000)); then
    echo "SUCCESS: bashrc loaded in ${duration}ms"
else
    echo "FAILURE: bashrc took ${duration}ms (too slow)"
    exit 1
fi

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    if "$test_script" "$BASH_RC"; then
        assert_success "bashrc should load quickly"
    else
        assert_failure "bashrc should load quickly"
    fi
    
    rm -f "$test_script"
}

# Test: bashrc doesn't break when sourced multiple times
test_multiple_sourcing() {
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

# Source bashrc multiple times
source "$1" >/dev/null 2>&1
source "$1" >/dev/null 2>&1
source "$1" >/dev/null 2>&1

echo "SUCCESS: bashrc can be sourced multiple times without breaking"

# Cleanup
rm -rf "$HOME"
EOF
    chmod +x "$test_script"
    
    if "$test_script" "$BASH_RC"; then
        assert_success "bashrc should handle multiple sourcing gracefully"
    else
        assert_failure "bashrc should handle multiple sourcing gracefully"
    fi
    
    rm -f "$test_script"
}

# Main test runner
main() {
    printf '%sRunning robust shell login tests%s\n' "$BLUE" "$RESET"
    printf 'Repository root: %s\n' "$REPO_ROOT"
    printf 'Bash config dir: %s\n' "$BASH_CONFIG_DIR"
    printf 'Bashrc file: %s\n' "$BASH_RC"
    printf '\n'
    
    # Run all tests
    test_bashrc_file_exists
    test_bashrc_syntax
    test_bashrc_sources_cleanly
    test_environment_variables_set
    test_history_configuration
    test_prompt_is_set
    test_non_interactive_handling
    test_bashrc_performance
    test_multiple_sourcing
    
    printf '\n%sRobust shell login tests completed%s\n' "$GREEN" "$RESET"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi