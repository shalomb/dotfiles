#!/bin/bash
# Completely isolated test environment - NO REAL BROWSERS ALLOWED

set -e

# Override ALL possible browser commands
export BROWSER="echo 'BROWSER_BLOCKED'"
export AWS_SSO_BROWSER="echo 'AWS_SSO_BROWSER_BLOCKED'"

# Create mock versions of all browser commands
x-www-browser() { echo "Mock browser: $*"; }
firefox() { echo "Mock firefox: $*"; }
chrome() { echo "Mock chrome: $*"; }
chromium() { echo "Mock chromium: $*"; }
google-chrome() { echo "Mock google-chrome: $*"; }

# Source our test functions
source "${BASH_SOURCE[0]%/*}/test-aws-functions.sh"

# Execute the command passed as argument
exec "$@"