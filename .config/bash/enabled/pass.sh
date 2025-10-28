#!/bin/bash

export PASSWORD_STORE_DIR="${HOME}/.local/share/pass"

# Smart GPG key detection with preference for specific key
get_preferred_gpg_key() {
    local preferred_key="6E58CBDB4D4FFAF09114729738495CCA2D2EF563"
    
    # Check if preferred key exists and is available
    if gpg --list-secret-keys --keyid-format=long 2>/dev/null | grep -q "${preferred_key}"; then
        echo "${preferred_key}"
        return 0
    fi
    
    # Fall back to first available key
    gpg --list-secret-keys --keyid-format=long 2>/dev/null | grep -E "^sec" | head -1 | awk '{print $2}' | cut -d'/' -f2
}

_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions" # Reusing completion cache dir
_gpg_key_cache_file="${_cache_dir}/pass_gpg_key_id"

# Create the cache directory if it doesn't exist.
mkdir -p "$_cache_dir"

_regenerate_gpg_key_cache=false

# If the cache file doesn't exist, or if the gpg binary is
# newer than the cache file, regenerate it.
if [[ ! -f "$_gpg_key_cache_file" || "$(command -v gpg)" -nt "$_gpg_key_cache_file" ]]; then
    _regenerate_gpg_key_cache=true
fi

if $_regenerate_gpg_key_cache; then
    GPG_KEY_ID=$(get_preferred_gpg_key)
    echo "$GPG_KEY_ID" > "$_gpg_key_cache_file"
else
    GPG_KEY_ID=$(cat "$_gpg_key_cache_file")
fi

if [[ -n "$GPG_KEY_ID" ]]; then
    export PASSWORD_STORE_KEY="${GPG_KEY_ID}"
else
    echo "Warning: No GPG key found for password store"
fi
