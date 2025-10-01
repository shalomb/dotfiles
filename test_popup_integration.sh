#!/bin/bash
echo "=== TMUXIE POPUP INTEGRATION TEST ==="
echo "Testing tmuxie in popup context..."
echo ""

# Test 1: Direct tmuxie call with popup environment
echo "Test 1: Direct tmuxie call"
TERM=tmux-256color tmuxie --verbose -s 2>&1 | head -5
echo ""

# Test 2: Check if popup would work
echo "Test 2: Simulating popup environment"
echo "Environment check:"
echo "TMUX: $TMUX"
echo "TERM: $TERM"
echo ""

# Test 3: Test session listing
echo "Test 3: Session listing"
tmuxie --verbose -l 2>&1 | head -5
echo ""

echo "Integration test completed"