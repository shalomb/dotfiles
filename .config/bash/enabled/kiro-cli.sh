#!/bin/bash
# Kiro CLI Integration
# ====================
# Provides Kiro CLI shell integration hooks for bashrc and bash_profile
# This file is sourced early in bashrc/profile to provide the integration functions

# AGENT_CONTEXT: Kiro CLI shell integration hooks
# ARCHITECTURE: Functions are called at specific points in bashrc/profile
# DESIGN_PATTERN: Pre/post hooks that can be called at the right times

_kiro_cli_bashrc_pre() {
    # Kiro CLI pre block for bashrc
    [[ -f "${HOME}/.local/share/kiro-cli/shell/bashrc.pre.bash" ]] && builtin source "${HOME}/.local/share/kiro-cli/shell/bashrc.pre.bash"
}

_kiro_cli_bashrc_post() {
    # Kiro CLI post block for bashrc
    [[ -f "${HOME}/.local/share/kiro-cli/shell/bashrc.post.bash" ]] && builtin source "${HOME}/.local/share/kiro-cli/shell/bashrc.post.bash"
}

_kiro_cli_profile_pre() {
    # Kiro CLI pre block for bash_profile
    [[ -f "${HOME}/.local/share/kiro-cli/shell/bash_profile.pre.bash" ]] && builtin source "${HOME}/.local/share/kiro-cli/shell/bash_profile.pre.bash"
}

_kiro_cli_profile_post() {
    # Kiro CLI post block for bash_profile
    [[ -f "${HOME}/.local/share/kiro-cli/shell/bash_profile.post.bash" ]] && builtin source "${HOME}/.local/share/kiro-cli/shell/bash_profile.post.bash"
}
