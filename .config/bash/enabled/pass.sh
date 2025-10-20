#!/bin/bash

export PASSWORD_STORE_DIR="$HOME/.local/share/pass"

# Dynamically detect the GPG key ID instead of hardcoding
if command -v gpg >/dev/null 2>&1; then
    # Try to get the default GPG key
    GPG_KEY_ID=$(gpg --list-secret-keys --keyid-format=long 2>/dev/null | grep -E "^sec" | head -1 | awk '{print $2}' | cut -d'/' -f2)
    if [[ -n "$GPG_KEY_ID" ]]; then
        export PASSWORD_STORE_KEY="$GPG_KEY_ID"
    else
        echo "Warning: No GPG key found for password store"
    fi
else
    echo "Warning: GPG not found, password store may not work"
fi
