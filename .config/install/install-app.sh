#!/bin/bash
set -e

# Generic app installer with heuristic fallback
# Usage: install-app.sh <app-name>

APP_NAME="$1"

if [ -z "$APP_NAME" ]; then
    echo "Usage: $0 <app-name>"
    echo "Example: $0 helm"
    exit 1
fi

echo "Installing $APP_NAME..."

# Check if already installed
if command -v "$APP_NAME" >/dev/null 2>&1; then
    echo "✓ $APP_NAME is already installed: $(command -v "$APP_NAME")"
    exit 0
fi

# Method 1: Try apt-get first
echo "Trying apt-get installation..."
if sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y "$APP_NAME" >/dev/null 2>&1; then
    echo "✓ $APP_NAME installed via apt-get"
    exit 0
fi

# Method 2: Try fetch-me
echo "Trying fetch-me discovery..."
FETCH_ME="$(dirname "$0")/../bin/fetch-me"
if [ -f "$FETCH_ME" ]; then
    # Try to find the app using fetch-me
    if "$FETCH_ME" -f "$APP_NAME" >/dev/null 2>&1; then
        echo "Found $APP_NAME on GitHub, attempting installation..."
        if "$FETCH_ME" "$APP_NAME" >/dev/null 2>&1; then
            echo "✓ $APP_NAME installed via fetch-me"
            exit 0
        fi
    fi
fi

# Method 3: Try custom install scripts
echo "Trying custom install scripts..."
INSTALL_SCRIPT="$(dirname "$0")/install-${APP_NAME}.sh"
if [ -f "$INSTALL_SCRIPT" ]; then
    echo "Found custom install script for $APP_NAME"
    if bash "$INSTALL_SCRIPT"; then
        echo "✓ $APP_NAME installed via custom script"
        exit 0
    fi
fi

# Method 4: Try common package managers
echo "Trying other package managers..."

# Try snap
if command -v snap >/dev/null 2>&1; then
    if sudo snap install "$APP_NAME" >/dev/null 2>&1; then
        echo "✓ $APP_NAME installed via snap"
        exit 0
    fi
fi

# Try flatpak
if command -v flatpak >/dev/null 2>&1; then
    if flatpak install -y "$APP_NAME" >/dev/null 2>&1; then
        echo "✓ $APP_NAME installed via flatpak"
        exit 0
    fi
fi

# Try pip (for Python tools)
if command -v pip >/dev/null 2>&1; then
    if pip install "$APP_NAME" >/dev/null 2>&1; then
        echo "✓ $APP_NAME installed via pip"
        exit 0
    fi
fi

# Try npm (for Node.js tools)
if command -v npm >/dev/null 2>&1; then
    if npm install -g "$APP_NAME" >/dev/null 2>&1; then
        echo "✓ $APP_NAME installed via npm"
        exit 0
    fi
fi

# Try cargo (for Rust tools)
if command -v cargo >/dev/null 2>&1; then
    if cargo install "$APP_NAME" >/dev/null 2>&1; then
        echo "✓ $APP_NAME installed via cargo"
        exit 0
    fi
fi

# Try go install (for Go tools)
if command -v go >/dev/null 2>&1; then
    if go install "$APP_NAME" >/dev/null 2>&1; then
        echo "✓ $APP_NAME installed via go install"
        exit 0
    fi
fi

echo "✗ Failed to install $APP_NAME using any available method"
echo ""
echo "Available installation methods tried:"
echo "  1. apt-get"
echo "  2. fetch-me (GitHub releases)"
echo "  3. Custom install script"
echo "  4. snap"
echo "  5. flatpak"
echo "  6. pip"
echo "  7. npm"
echo "  8. cargo"
echo "  9. go install"
echo ""
echo "You may need to install $APP_NAME manually or create a custom install script:"
echo "  $(dirname "$0")/install-${APP_NAME}.sh"
exit 1
