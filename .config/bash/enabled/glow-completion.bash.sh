#!/bin/bash
# Glow completion with file name support
# ======================================
# Provides bash completion for glow command, including file/directory completion
# for markdown files and directories

_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
_completion_file="${_cache_dir}/glow"

# Create the cache directory if it doesn't exist.
mkdir -p "$_cache_dir"

# If the completion file doesn't exist, or if the glow binary is
# newer than the completion file, regenerate it.
if [[ ! -f "$_completion_file" || "$(command -v glow)" -nt "$_completion_file" ]]; then
  glow completion bash > "$_completion_file"
fi

# Source the completion file.
source "$_completion_file"

# Enhance the completion to include file/directory completion
# The original __start_glow handles flags, we add file completion for non-flag arguments
_glow_enhanced_completion() {
    local cur prev words cword
    _init_completion -n "=:" || return
    
    # If current word starts with '-', use the original glow completion (flags)
    if [[ "$cur" == -* ]]; then
        __start_glow
        return
    fi
    
    # If previous word was a flag that takes an argument, use original completion
    case "$prev" in
        --config|--style|--width|-s|-w)
            __start_glow
            return
            ;;
    esac
    
    # For the first argument (position 1), complete files and directories
    # glow accepts: glow [SOURCE|DIR] [flags]
    if [[ $cword -eq 1 ]]; then
        # Enable default file completion
        compopt -o default -o plusdirs
        # Use bash's built-in file completion if available, otherwise use compgen
        if declare -f _filedir >/dev/null 2>&1; then
            _filedir
        else
            # Fallback: use compgen for file completion
            COMPREPLY=($(compgen -f -- "$cur"))
        fi
    else
        # For subsequent arguments, use original glow completion
        __start_glow
    fi
}

# Replace the completion function with our enhanced version
complete -o default -F _glow_enhanced_completion glow
