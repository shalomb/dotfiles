#!/bin/bash

# browse-md - Markdown-focused HTTP server for viewing files in browser
# Usage: browse-md <start|stop|list|help> [options]
# 
# Starts a Python HTTP server optimized for browsing markdown files.
# Automatically renders .md files as HTML and provides easy navigation.

browse-md() {
    local command="${1:-start}"
    shift
    
    case "$command" in
        start)
            browse-md-start "$@"
            ;;
        stop)
            browse-md-stop "$@"
            ;;
        list)
            browse-md-list
            ;;
        help|--help|-h)
            browse-md-help
            ;;
        *)
            echo "❌ Unknown command: $command"
            echo "Use 'browse-md help' for usage information"
            return 1
            ;;
    esac
}

browse-md-start() {
    local port="${1:-9999}"
    local directory="${2:-.}"
    local vm_ip
    local url
    local pid_file
    
    # Use XDG state directory for better organization
    local state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/browse-md"
    mkdir -p "$state_dir"
    pid_file="${state_dir}/browse-md-${port}.pid"
    
    # Get VM IP address
    vm_ip=$(hostname -I | awk '{print $1}')
    
    # Check if port is already in use
    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "❌ Port $port is already in use (PID: $(cat "$pid_file"))"
        echo "   Kill it with: kill $(cat "$pid_file")"
        echo "   Or use a different port: browse-md start $((port + 1))"
        return 1
    fi
    
    # Change to specified directory
    if [[ ! -d "$directory" ]]; then
        echo "❌ Directory '$directory' does not exist"
        return 1
    fi
    
    cd "$directory" || return 1
    
    # Start HTTP server in background
    echo "🚀 Starting markdown HTTP server on port $port..."
    echo "📁 Serving directory: $(pwd)"
    
    # Start simple markdown HTTP server
    python3 "$(dirname "${BASH_SOURCE[0]}")/simple_markdown_server.py" "$port" "$(pwd)" >/dev/null 2>&1 &
    local server_pid=$!
    
    # Save PID for cleanup
    echo "$server_pid" > "$pid_file"
    
    # Construct URL
    url="http://${vm_ip}:${port}"
    
    echo "🌐 Server started! (PID: $server_pid)"
    echo "📱 URL: $url"
    echo "🛑 Stop server: kill $server_pid"
    echo ""
    
    # Open in browser
    if command -v x-www-browser >/dev/null 2>&1; then
        echo "🌍 Opening in browser..."
        x-www-browser "$url" &
    else
        echo "⚠️  No browser found. Open manually: $url"
    fi
    
    # Show some helpful info
    echo ""
    echo "💡 Tips:"
    echo "   - Access from host Mac: $url"
    echo "   - Access from VM: http://localhost:$port"
    echo "   - Stop server: kill $server_pid"
    echo "   - Check if running: ps aux | grep 'simple_markdown_server.py'"
}

# Cleanup function to stop servers
browse-md-stop() {
    local port="${1:-9999}"
    local state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/browse-md"
    local pid_file="${state_dir}/browse-md-${port}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$pid_file"
            echo "✅ Stopped browse-md server on port $port (PID: $pid)"
        else
            echo "⚠️  No running server found on port $port"
            rm -f "$pid_file"
        fi
    else
        echo "⚠️  No PID file found for port $port"
    fi
}

# List running servers
browse-md-list() {
    echo "🔍 Running browse-md servers:"
    local state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/browse-md"
    for pid_file in "${state_dir}"/browse-md-*.pid; do
        if [[ -f "$pid_file" ]]; then
            local filename="${pid_file##*/}"  # Remove directory path
            local port="${filename#browse-md-}"  # Remove prefix
            port="${port%.pid}"  # Remove suffix
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                local vm_ip=$(hostname -I | awk '{print $1}')
                echo "   Port $port: http://${vm_ip}:${port} (PID: $pid)"
            else
                echo "   Port $port: stopped (stale PID file)"
                rm -f "$pid_file"
            fi
        fi
    done
}

# Help function
browse-md-help() {
    echo "browse-md - Markdown-focused HTTP server for viewing files in browser"
    echo ""
    echo "Usage:"
    echo "  browse-md [start] [port] [directory]  - Start server (default: port 9999, current dir)"
    echo "  browse-md stop [port]                 - Stop server on port (default: 9999)"
    echo "  browse-md list                        - List running servers"
    echo "  browse-md help                        - Show this help"
    echo ""
    echo "Examples:"
    echo "  browse-md                            # Start on port 9999 in current directory"
    echo "  browse-md start 3000                 # Start on port 3000 in current directory"
    echo "  browse-md start 8080 ./docs          # Start on port 8080 in ./docs directory"
    echo "  browse-md stop                       # Stop server on port 9999"
    echo "  browse-md stop 3000                  # Stop server on port 3000"
    echo ""
    echo "Features:"
    echo "  📝 Markdown files (.md) are rendered as beautiful HTML"
    echo "  🎨 Code blocks get syntax highlighting"
    echo "  📁 Directory listings highlight markdown files"
    echo "  🔗 Easy navigation between files and directories"
    echo ""
    echo "The server will be accessible at:"
    echo "  - From host Mac: http://<VM_IP>:<port>"
    echo "  - From VM: http://localhost:<port>"
}