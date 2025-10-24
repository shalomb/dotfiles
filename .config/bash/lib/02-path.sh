#!/bin/bash
# PATH setup - single source of truth
# PHASE: env
# DEPENDENCIES: XDG_DATA_HOME

# Only set PATH if not already set (allow parent shell to override)
if [[ -z "${BASH_PATH_SET:-}" ]]; then
    # Start with system defaults
    PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"

    # Add user directories in priority order
    _add_to_path() {
        [[ -d "$1" ]] && PATH="$1:$PATH"
    }

    # Reverse priority order (last added = highest priority)
    _add_to_path "/usr/share/perl6/site/bin"
    _add_to_path "$HOME/.arkade/bin"
    _add_to_path "$HOME/.rbenv/bin"
    _add_to_path "$HOME/.nvm"
    _add_to_path "$HOME/.venv/bin"
    _add_to_path "$XDG_DATA_HOME/bob/nvim-bin"
    _add_to_path "$HOME/.cargo/bin"
    _add_to_path "$HOME/go/bin"
    _add_to_path "$XDG_DATA_HOME/go/bin"
    _add_to_path "$HOME/.config/bin"
    _add_to_path "$HOME/.local/bin"

    export PATH
    export BASH_PATH_SET=1

    unset -f _add_to_path
fi

# Define clean_path function for later use
clean_path() {
    local var_name="$1"
    local path_value="${!var_name}"

    [[ -z "$path_value" ]] && return 0

    local -A seen_paths=()
    local cleaned_paths=()

    IFS=':' read -ra path_array <<< "$path_value"

    for path in "${path_array[@]}"; do
        [[ -z "$path" ]] && continue

        # Normalize and deduplicate
        local normalized_path
        if [[ "$path" == /* ]]; then
            normalized_path="$(realpath "$path" 2>/dev/null || echo "$path")"
            [[ ! -d "$normalized_path" ]] && continue
        else
            normalized_path="$path"
        fi

        [[ -n "${seen_paths[$normalized_path]:-}" ]] && continue

        cleaned_paths+=("$normalized_path")
        seen_paths["$normalized_path"]=1
    done

    local result
    printf -v result '%s:' "${cleaned_paths[@]}"
    printf -v "$var_name" '%s' "${result%:}"
}