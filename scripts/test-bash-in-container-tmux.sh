#!/bin/bash
# AGENT_CONTEXT: Interactive bash config testing in tmux with container
# ARCHITECTURE: Tmux integration for visual container testing
# DESIGN_PATTERN: Split-pane interactive testing

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}▶️  $1${NC}"
}

# Check if we're in tmux
if [[ -z "${TMUX:-}" ]]; then
    log_error "This script must be run inside a tmux session"
    echo "Start tmux first: tmux"
    exit 1
fi

# Detect OS and container image
log_step "Detecting host OS and selecting container image..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

eval "$("$SCRIPT_DIR/detect-container-image.sh" 2>/dev/null | grep "^CONTAINER_IMAGE=")"

if [[ -z "${CONTAINER_IMAGE:-}" ]]; then
    log_error "Failed to detect container image"
    exit 1
fi

log_success "Using container image: $CONTAINER_IMAGE"

# Generate unique container name
CONTAINER_NAME="dotfiles-bash-test-$(date +%s)"
TEST_USER="unop"

log_step "Creating container: $CONTAINER_NAME"

# Build container with OS-matched base image
log_info "Building container from Containerfile with BASE_IMAGE=$CONTAINER_IMAGE..."
if ! podman build \
    --build-arg "BASE_IMAGE=$CONTAINER_IMAGE" \
    -t dotfiles-test:latest \
    -f "$DOTFILES_DIR/Containerfile" \
    "$DOTFILES_DIR" 2>&1 | grep -E "(STEP|COMMIT|Error)" ; then
    log_error "Container build failed"
    exit 1
fi

log_success "Container built successfully"

# Run container in detached mode
log_step "Starting container..."
if ! podman run -d \
    --name "$CONTAINER_NAME" \
    --hostname "dotfiles-test" \
    dotfiles-test:latest \
    sleep infinity ; then
    log_error "Failed to start container"
    exit 1
fi

log_success "Container started: $CONTAINER_NAME"

# Copy dotfiles into container
log_step "Copying dotfiles to container..."
podman cp "$DOTFILES_DIR/.config" "$CONTAINER_NAME:/home/$TEST_USER/"

# Set up dotfiles symlinks
log_step "Setting up dotfiles symlinks in container..."
podman exec "$CONTAINER_NAME" bash -c "
    chown -R $TEST_USER:$TEST_USER /home/$TEST_USER/.config
    ln -sf /home/$TEST_USER/.config/bash/bashrc /home/$TEST_USER/.bashrc
    ln -sf /home/$TEST_USER/.config/bash/profile /home/$TEST_USER/.bash_profile
"

log_success "Dotfiles configured in container"

# Split tmux window horizontally
log_step "Creating tmux horizontal split..."
tmux split-window -h -d

# Get the new pane ID
NEW_PANE=$(tmux display-message -p '#{pane_id}')

log_success "Created new tmux pane: $NEW_PANE"

# Create exploratory test script
TEST_SCRIPT=$(cat <<'EOTEST'
#!/bin/bash
# Exploratory bash config tests

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  BASH CONFIG EXPLORATORY TESTING IN CONTAINER                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Test functions
test_basic_vars() {
    echo "━━━ 1. Basic Environment Variables ━━━"
    echo "SHELL: $SHELL"
    echo "HOME: $HOME"
    echo "USER: $USER"
    echo "PWD: $PWD"
    echo ""
}

test_xdg_vars() {
    echo "━━━ 2. XDG Base Directory Variables ━━━"
    echo "XDG_CONFIG_HOME: ${XDG_CONFIG_HOME:-NOT SET}"
    echo "XDG_DATA_HOME: ${XDG_DATA_HOME:-NOT SET}"
    echo "XDG_STATE_HOME: ${XDG_STATE_HOME:-NOT SET}"
    echo "XDG_CACHE_HOME: ${XDG_CACHE_HOME:-NOT SET}"
    echo ""
}

test_path() {
    echo "━━━ 3. PATH Components ━━━"
    echo "$PATH" | tr ':' '\n' | nl
    echo ""

    echo "Checking for important paths:"
    if echo "$PATH" | grep -q "\.local/bin"; then
        echo "✅ .local/bin in PATH"
    else
        echo "❌ .local/bin NOT in PATH"
    fi

    if echo "$PATH" | grep -q "\.cargo/bin"; then
        echo "✅ .cargo/bin in PATH"
    else
        echo "⚠️  .cargo/bin NOT in PATH (expected if cargo not installed)"
    fi
    echo ""
}

test_core_functions() {
    echo "━━━ 4. Core Functions Availability ━━━"

    local functions=(
        "has-cmd"
        "@has-cmd"
        "defined"
        "@is-interactive"
        "dotfiles"
        "call-if-defined"
    )

    for func in "${functions[@]}"; do
        if type -t "$func" &>/dev/null; then
            echo "✅ Function available: $func"
        else
            echo "❌ Function MISSING: $func"
        fi
    done
    echo ""
}

test_bashrc_vars() {
    echo "━━━ 5. Bashrc-Specific Variables ━━━"
    echo "BASHRC_DIR: ${BASHRC_DIR:-NOT SET}"
    echo "DOTFILES_DIR: ${DOTFILES_DIR:-NOT SET}"
    echo "INTERACTIVE_MODE: ${INTERACTIVE_MODE:-NOT SET}"
    echo ""
}

test_aliases() {
    echo "━━━ 6. Alias Availability ━━━"
    local alias_count
    alias_count=$(alias 2>/dev/null | wc -l)
    echo "Total aliases: $alias_count"

    if [[ $alias_count -gt 0 ]]; then
        echo "Sample aliases:"
        alias 2>/dev/null | head -5
    fi
    echo ""
}

test_edge_cases() {
    echo "━━━ 7. Edge Case Testing ━━━"

    # Test function with special characters
    echo -n "Testing @has-cmd with ls: "
    if @has-cmd ls 2>/dev/null; then
        echo "✅ Works"
    else
        echo "❌ Failed"
    fi

    # Test BASHRC_DIR resolution from different directory
    echo -n "Testing BASHRC_DIR from /tmp: "
    local bashrc_from_tmp
    bashrc_from_tmp=$(cd /tmp && bash -c 'source ~/.bashrc 2>/dev/null && echo $BASHRC_DIR')
    if [[ "$bashrc_from_tmp" == *"/.config/bash" ]]; then
        echo "✅ Resolves correctly: $bashrc_from_tmp"
    else
        echo "❌ Failed: $bashrc_from_tmp"
    fi

    # Test non-interactive shell
    echo -n "Testing non-interactive shell behavior: "
    local func_count
    func_count=$(bash -c 'source ~/.bashrc 2>/dev/null; type -t @has-cmd' 2>/dev/null)
    if [[ "$func_count" == "function" ]]; then
        echo "✅ Functions load in non-interactive"
    else
        echo "❌ Functions don't load in non-interactive"
    fi

    echo ""
}

test_agent_status() {
    echo "━━━ 8. Agent Status (if agentctl available) ━━━"
    if type -t agentctl &>/dev/null; then
        echo "agentctl is available"
        agentctl status 2>&1 || echo "⚠️  agentctl failed (expected in container)"
    else
        echo "⚠️  agentctl not available (expected - requires uv/python)"
    fi
    echo ""
}

# Run all tests
test_basic_vars
test_xdg_vars
test_path
test_core_functions
test_bashrc_vars
test_aliases
test_edge_cases
test_agent_status

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  EXPLORATORY TESTING COMPLETE                                  ║"
echo "║  You now have an interactive shell in the container.          ║"
echo "║  Try your own tests or type 'exit' to cleanup.               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
EOTEST
)

# Write test script to container
echo "$TEST_SCRIPT" | podman exec -i "$CONTAINER_NAME" bash -c "cat > /tmp/test-bash-config.sh && chmod +x /tmp/test-bash-config.sh"

# Send commands to the new pane
log_step "Connecting to container in new pane..."

# Execute in the new pane
tmux send-keys -t "$NEW_PANE" "# Entering container $CONTAINER_NAME" C-m
tmux send-keys -t "$NEW_PANE" "podman exec -it -u $TEST_USER $CONTAINER_NAME bash" C-m
sleep 1
tmux send-keys -t "$NEW_PANE" "# Running exploratory tests..." C-m
tmux send-keys -t "$NEW_PANE" "/tmp/test-bash-config.sh" C-m

# Focus on new pane
tmux select-pane -t "$NEW_PANE"

log_success "Container testing environment ready!"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Container: $CONTAINER_NAME"
echo "Image: $CONTAINER_IMAGE"
echo "User: $TEST_USER"
echo ""
echo "The exploratory tests are running in the right pane."
echo "After tests complete, you have an interactive shell in the container."
echo ""
echo "To cleanup when done:"
echo "  1. Exit the container shell (Ctrl-D or 'exit')"
echo "  2. Run: podman rm -f $CONTAINER_NAME"
echo ""
echo "Or run: podman rm -f $CONTAINER_NAME (from this pane)"
echo "════════════════════════════════════════════════════════════════"
