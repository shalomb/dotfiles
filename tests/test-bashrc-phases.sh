#!/bin/bash
# Test suite for minimal bashrc rebuild (phase by phase)
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test result tracking
pass() {
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} $1"
    [[ -n "${2:-}" ]] && echo -e "  ${YELLOW}$2${NC}"
}

# Find bashrc
BASHRC="${BASHRC:-$HOME/.config/dotfiles/.config/bash/bashrc}"

if [[ ! -f "$BASHRC" ]]; then
    echo -e "${RED}ERROR: bashrc not found at $BASHRC${NC}"
    exit 1
fi

echo "Testing bashrc: $BASHRC"
echo "========================================"
echo ""

# =============================================================================
# PHASE 0: Bootstrap Tests
# =============================================================================

echo "PHASE 0: Bootstrap"
echo "-------------------"

# Test: BASHRC_DIR resolution
result=$(bash -c "source '$BASHRC' && echo \$BASHRC_DIR")
if [[ "$result" == *"/.config/bash" ]]; then
    pass "BASHRC_DIR resolves correctly"
else
    fail "BASHRC_DIR resolution failed" "Got: $result"
fi

# Test: DOTFILES_DIR derivation
result=$(bash -c "source '$BASHRC' && echo \$DOTFILES_DIR")
if [[ "$result" == *"/dotfiles" ]]; then
    pass "DOTFILES_DIR derives correctly"
else
    fail "DOTFILES_DIR derivation failed" "Got: $result"
fi

# Test: Interactive mode detection (non-interactive)
result=$(bash -c "source '$BASHRC' && echo \$INTERACTIVE_MODE")
if [[ "$result" == "0" ]]; then
    pass "Non-interactive mode detected correctly"
else
    fail "Non-interactive mode detection failed" "Got: $result (expected 0)"
fi

# Test: Interactive mode detection (interactive)
result=$(bash -i -c "source '$BASHRC' && echo \$INTERACTIVE_MODE" 2>&1 | grep -o "INTERACTIVE_MODE=." | cut -d= -f2)
if [[ "$result" == "1" ]]; then
    pass "Interactive mode detected correctly"
else
    fail "Interactive mode detection failed" "Got: $result (expected 1)"
fi

# Test: Bootstrap doesn't fail
if bash -c "source '$BASHRC'" 2>&1 | grep -q "ERROR:"; then
    fail "Bootstrap has errors"
else
    pass "Bootstrap completes without errors"
fi

echo ""

# =============================================================================
# PHASE 1: Environment Tests
# =============================================================================

echo "PHASE 1: Environment"
echo "--------------------"

# Test: XDG_CONFIG_HOME set
result=$(bash -c "source '$BASHRC' && echo \$XDG_CONFIG_HOME")
if [[ -n "$result" && "$result" == *"/.config" ]]; then
    pass "XDG_CONFIG_HOME is set"
else
    fail "XDG_CONFIG_HOME not set correctly" "Got: $result"
fi

# Test: XDG_CACHE_HOME set
result=$(bash -c "source '$BASHRC' && echo \$XDG_CACHE_HOME")
if [[ -n "$result" && "$result" == *"/.cache" ]]; then
    pass "XDG_CACHE_HOME is set"
else
    fail "XDG_CACHE_HOME not set correctly" "Got: $result"
fi

# Test: XDG_DATA_HOME set
result=$(bash -c "source '$BASHRC' && echo \$XDG_DATA_HOME")
if [[ -n "$result" && "$result" == *"/.local/share" ]]; then
    pass "XDG_DATA_HOME is set"
else
    fail "XDG_DATA_HOME not set correctly" "Got: $result"
fi

# Test: XDG_STATE_HOME set
result=$(bash -c "source '$BASHRC' && echo \$XDG_STATE_HOME")
if [[ -n "$result" && "$result" == *"/.local/state" ]]; then
    pass "XDG_STATE_HOME is set"
else
    fail "XDG_STATE_HOME not set correctly" "Got: $result"
fi

# Test: PATH includes ~/.local/bin
result=$(bash -c "source '$BASHRC' && echo \$PATH")
if echo "$result" | grep -q "$HOME/.local/bin"; then
    pass "PATH includes ~/.local/bin"
else
    fail "PATH missing ~/.local/bin" "Got: $result"
fi

# Test: PATH includes ~/.cargo/bin
if echo "$result" | grep -q "$HOME/.cargo/bin"; then
    pass "PATH includes ~/.cargo/bin"
else
    fail "PATH missing ~/.cargo/bin" "Got: $result"
fi

# Test: PATH includes ~/go/bin
if echo "$result" | grep -q "$HOME/go/bin"; then
    pass "PATH includes ~/go/bin"
else
    fail "PATH missing ~/go/bin" "Got: $result"
fi

# Test: PATH includes system directories
if echo "$result" | grep -q "/usr/bin"; then
    pass "PATH includes system directories"
else
    fail "PATH missing system directories" "Got: $result"
fi

echo ""

# =============================================================================
# PHASE 2: Core Functions Tests
# =============================================================================

echo "PHASE 2: Core Functions"
echo "-----------------------"

# Test: has-cmd function exists
result=$(bash -c "source '$BASHRC' && type -t has-cmd")
if [[ "$result" == "function" ]]; then
    pass "has-cmd function exists"
else
    fail "has-cmd function not found" "Got type: $result"
fi

# Test: has-cmd works correctly
if bash -c "source '$BASHRC' && has-cmd bash" >/dev/null 2>&1; then
    pass "has-cmd detects existing command"
else
    fail "has-cmd failed to detect bash command"
fi

# Test: has-cmd fails for non-existent command
if bash -c "source '$BASHRC' && ! has-cmd nonexistent-command-xyz" >/dev/null 2>&1; then
    pass "has-cmd correctly fails for non-existent command"
else
    fail "has-cmd incorrectly detected non-existent command"
fi

# Test: @has-cmd alias exists
if bash -c "source '$BASHRC' && @has-cmd ls" >/dev/null 2>&1; then
    pass "@has-cmd compatibility alias works"
else
    fail "@has-cmd alias not working"
fi

# Test: defined function exists
result=$(bash -c "source '$BASHRC' && type -t defined")
if [[ "$result" == "function" ]]; then
    pass "defined function exists"
else
    fail "defined function not found" "Got type: $result"
fi

# Test: defined works correctly
if bash -c "source '$BASHRC' && defined has-cmd" >/dev/null 2>&1; then
    pass "defined detects existing function"
else
    fail "defined failed to detect has-cmd function"
fi

# Test: defined fails for non-existent function
if bash -c "source '$BASHRC' && ! defined nonexistent-function-xyz" >/dev/null 2>&1; then
    pass "defined correctly fails for non-existent function"
else
    fail "defined incorrectly detected non-existent function"
fi

# Test: @is-interactive function exists
result=$(bash -c "source '$BASHRC' && type -t @is-interactive")
if [[ "$result" == "function" ]]; then
    pass "@is-interactive function exists"
else
    fail "@is-interactive function not found" "Got type: $result"
fi

# Test: call-if-defined function exists
result=$(bash -c "source '$BASHRC' && type -t call-if-defined")
if [[ "$result" == "function" ]]; then
    pass "call-if-defined function exists"
else
    fail "call-if-defined function not found" "Got type: $result"
fi

echo ""

# =============================================================================
# Integration Tests
# =============================================================================

echo "INTEGRATION TESTS"
echo "-----------------"

# Test: Sourcing from different directories
cd /tmp
if bash -c "source '$BASHRC' && echo \$BASHRC_DIR" >/dev/null 2>&1; then
    pass "Sources correctly from /tmp"
else
    fail "Failed to source from /tmp"
fi

cd "$HOME"
if bash -c "source '$BASHRC' && echo \$BASHRC_DIR" >/dev/null 2>&1; then
    pass "Sources correctly from HOME"
else
    fail "Failed to source from HOME"
fi

# Test: Idempotency (source twice)
result=$(bash -c "
    source '$BASHRC'
    PATH1=\$PATH
    source '$BASHRC'
    PATH2=\$PATH
    [[ \$PATH1 == \$PATH2 ]] && echo 'OK'
")
if [[ "$result" == "OK" ]]; then
    pass "Sourcing twice is idempotent (PATH unchanged)"
else
    fail "Sourcing twice changes PATH (not idempotent)"
fi

# Test: No errors in stderr
result=$(bash -c "source '$BASHRC'" 2>&1 | grep -iE "error|fail" || true)
if [[ -z "$result" ]]; then
    pass "No errors in stderr output"
else
    fail "Errors detected in stderr" "$result"
fi

# Test: Shellcheck validation
if command -v shellcheck >/dev/null 2>&1; then
    if shellcheck "$BASHRC" >/dev/null 2>&1; then
        pass "Shellcheck validation passes"
    else
        fail "Shellcheck validation failed"
    fi
else
    echo -e "${YELLOW}⊘${NC} Shellcheck not available (skipped)"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo "Total:  $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
else
    echo -e "Failed: $TESTS_FAILED"
fi
echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
