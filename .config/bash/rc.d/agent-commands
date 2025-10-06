# AGENT_CONTEXT: Agent-specific commands for dotfiles management
# ARCHITECTURE: Simple function-based commands for agent workflow
# DESIGN_PATTERN: Lightweight, single-purpose functions

# next - Signal agent to refresh AGENTS.md and get back on track
next() {
    echo "🔄 Refreshing AGENTS.md and getting back on track..."
    
    # Quick refresh of AGENTS.md
    if [[ -f "AGENTS.md" ]]; then
        echo "✅ AGENTS.md found - ready for agent review"
    else
        echo "❌ AGENTS.md not found - may need to navigate to dotfiles directory"
        return 1
    fi
    
    # Show current status
    echo "📊 Current status:"
    git status --porcelain | head -5
    
    # Show next highest priority from TODO.md
    if [[ -f "TODO.md" ]]; then
        echo "🎯 Next highest priority:"
        grep -A 3 "Next Highest Priority Task" TODO.md | head -4
    fi
    
    echo "🚀 Ready for next task!"
}

# agent-status - Quick agent workflow status
agent-status() {
    echo "🤖 Agent Workflow Status"
    echo "========================"
    
    # Check if in dotfiles directory
    if [[ -f "AGENTS.md" ]]; then
        echo "✅ In dotfiles directory"
    else
        echo "❌ Not in dotfiles directory - run 'cd ~/.config/dotfiles'"
        return 1
    fi
    
    # Check git status
    echo "📊 Git status:"
    git status --porcelain | head -3
    
    # Check TODO.md
    if [[ -f "TODO.md" ]]; then
        echo "📋 TODO status:"
        grep -A 2 "Next Highest Priority Task" TODO.md | head -3
    fi
    
    # Check test status
    echo "🧪 Test status:"
    if make test-fast >/dev/null 2>&1; then
        echo "✅ Tests passing"
    else
        echo "❌ Tests failing - run 'make test' for details"
    fi
}
