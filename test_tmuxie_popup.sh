#!/bin/bash
echo "=== TMUXIE POPUP TEST ==="
echo "Environment variables:"
env | grep -E "(TMUX|TERM)" | sort
echo ""
echo "Testing tmuxie -s in popup context:"
echo "Command: tmuxie --verbose -s"
echo "---"
timeout 10 tmuxie --verbose -s 2>&1 | head -20
echo "---"
echo "Test completed"