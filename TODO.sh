#!/bin/bash
# TODO: Audit enabled/ scripts for function pollution
#
# PROBLEM: 70 enabled scripts are sourced into every shell, defining functions
# that pollute the namespace even if never used.
#
# GOAL: Identify scripts that can be converted from sourced functions to
# standalone commands in ~/.local/bin/
#
# APPROACH:
# 1. Audit each enabled/*.sh file
# 2. Identify which define functions vs aliases vs environment setup
# 3. Classify by conversion difficulty:
#    - Easy: Simple function wrappers → can be standalone scripts
#    - Medium: Functions needing shell context → might need conversion
#    - Hard: Environment setup (PATH, aliases) → must stay sourced
# 4. Create conversion plan for "Easy" and "Medium" candidates
#
# BENEFITS:
# - Faster shell startup (less to source)
# - Cleaner namespace (functions only when called)
# - Better lazy-loading (command exists check is fast)
# - Easier testing (standalone scripts are testable)
#
# CRITERIA FOR CONVERSION:
# - Function is self-contained (no shell state dependencies)
# - Function doesn't modify shell environment (no cd, export, alias)
# - Function doesn't need to be in subshells (no export -f)
# - Function would benefit from being a standalone command
#
# OUTPUT:
# - List of candidates for conversion
# - Difficulty rating for each
# - Estimated namespace pollution reduction
#
# RELATED:
# - ADR-002: enabled/ Directory Uses File Movement
# - .config/bash/enabled/ - Current sourced scripts
# - ~/.local/bin/ - Target for standalone commands
