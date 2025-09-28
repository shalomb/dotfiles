#!/bin/bash
# Test-specific AWS functions that use mocks

# Source the consolidated AWS functions
source .config/bash/rc.d/aws

# Override aws-sso with our mock
aws-sso() {
    # Simple, predictable path - no dirname nonsense
    exec "${BASH_SOURCE[0]%/*}/mock-aws-sso.sh" "$@"
}

# Override x-www-browser with our mock browser
x-www-browser() {
    echo "Mock browser: $*"
}