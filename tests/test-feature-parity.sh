#!/bin/bash
# Feature parity check: Ensure minimal bashrc supports BEFORE snapshot features
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASHRC="${BASHRC:-$HOME/.config/dotfiles/.config/bash/bashrc}"
MISSING=0
PRESENT=0

echo "Feature Parity Check: BEFORE snapshot vs Minimal Rebuild"
echo "=========================================================="
echo ""

# Core Functions from BEFORE snapshot
echo "Core Functions (from rc.d/01-functions):"
echo "-----------------------------------------"

check_function() {
    local func="$1"
    if bash -c "source '$BASHRC' && type -t $func" 2>/dev/null | grep -q "function"; then
        echo -e "${GREEN}✓${NC} $func"
        PRESENT=$((PRESENT + 1))
    else
        echo -e "${RED}✗${NC} $func - MISSING"
        MISSING=$((MISSING + 1))
    fi
}

# Essential functions from BEFORE
check_function "@is-interactive"
check_function "@has-cmd"
check_function "has-cmd"
check_function "defined"
check_function "call-if-defined"

# Not yet implemented (need Phase 3+)
echo ""
echo -e "${YELLOW}Not Yet Implemented (Future Phases):${NC}"
check_function "warn"
check_function "die"
check_function "set-title"
check_function "chpwd"
check_function "bell-alert"
check_function "reload"

echo ""
echo "Aliases (need to be loaded from aliases file):"
echo "-----------------------------------------------"

# Check if aliases file exists and would load
if [[ -f "$HOME/.config/bash/aliases" ]]; then
    echo -e "${GREEN}✓${NC} aliases file exists"
    PRESENT=$((PRESENT + 1))
else
    echo -e "${RED}✗${NC} aliases file - MISSING"
    MISSING=$((MISSING + 1))
fi

echo ""
echo "Environment Variables:"
echo "----------------------"

check_var() {
    local var="$1"
    local expected="$2"
    result=$(bash -c "source '$BASHRC' && echo \${$var:-UNSET}")
    if [[ "$result" != "UNSET" ]]; then
        echo -e "${GREEN}✓${NC} $var (${expected})"
        PRESENT=$((PRESENT + 1))
    else
        echo -e "${RED}✗${NC} $var - MISSING"
        MISSING=$((MISSING + 1))
    fi
}

check_var "XDG_CONFIG_HOME" "XDG directory"
check_var "XDG_CACHE_HOME" "XDG directory"
check_var "XDG_DATA_HOME" "XDG directory"
check_var "XDG_STATE_HOME" "XDG directory"
check_var "PATH" "includes user bins"
check_var "BASHRC_DIR" "bootstrap"
check_var "DOTFILES_DIR" "bootstrap"

echo ""
echo -e "${YELLOW}Not Yet Set (Future Phases):${NC}"
check_var "HISTFILE" "history config"
check_var "HISTSIZE" "history config"
check_var "HISTCONTROL" "history config"
check_var "PS1" "prompt"

echo ""
echo "Tool Integrations (rc.d / enabled):"
echo "-----------------------------------"

# These exist but aren't loaded yet in minimal bashrc
if [[ -d "$HOME/.config/bash/enabled" ]]; then
    tool_count=$(ls -1 "$HOME/.config/bash/enabled"/*.sh 2>/dev/null | wc -l)
    echo -e "${GREEN}✓${NC} enabled/ directory exists with $tool_count tools"
    echo -e "${YELLOW}  Note: Not loaded yet in minimal bashrc (Phase 4+)${NC}"
    PRESENT=$((PRESENT + 1))
else
    echo -e "${RED}✗${NC} enabled/ directory - MISSING"
    MISSING=$((MISSING + 1))
fi

echo ""
echo "=========================================================="
echo "SUMMARY"
echo "=========================================================="
echo "Features Present: ${GREEN}$PRESENT${NC}"
echo "Features Missing: ${RED}$MISSING${NC}"
echo ""

if [[ $MISSING -eq 0 ]]; then
    echo -e "${GREEN}✅ Full feature parity achieved!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some features not yet implemented (expected in early phases)${NC}"
    echo ""
    echo "Next Steps:"
    echo "  Phase 3: Shell Config (history, options, completion)"
    echo "  Phase 4: Features (load enabled/ scripts)"
    echo "  Phase 5: Aliases (load aliases file)"
    echo "  Phase 6: Prompt (ghostship or simple PS1)"
    exit 0  # Don't fail - this is expected
fi
