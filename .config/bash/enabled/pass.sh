#!/bin/bash

export PASSWORD_STORE_DIR="$HOME/.local/share/pass"

# Smart GPG key detection with preference for specific key
get_preferred_gpg_key() {
    local preferred_key="6E58CBDB4D4FFAF09114729738495CCA2D2EF563"
    
    # Check if preferred key exists and is available
    if gpg --list-secret-keys --keyid-format=long 2>/dev/null | grep -q "$preferred_key"; then
        echo "$preferred_key"
        return 0
    fi
    
    # Fall back to first available key
    gpg --list-secret-keys --keyid-format=long 2>/dev/null | grep -E "^sec" | head -1 | awk '{print $2}' | cut -d'/' -f2
}

# Set PASSWORD_STORE_KEY using smart detection
if command -v gpg >/dev/null 2>&1; then
    GPG_KEY_ID=$(get_preferred_gpg_key)
    if [[ -n "$GPG_KEY_ID" ]]; then
        export PASSWORD_STORE_KEY="$GPG_KEY_ID"
    else
        echo "Warning: No GPG key found for password store"
    fi
else
    echo "Warning: GPG not found, password store may not work"
fi
