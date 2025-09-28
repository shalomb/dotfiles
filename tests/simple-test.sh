#!/bin/bash
# Simple, bulletproof test that should NEVER launch browsers

set -e

echo "=== Simple AWS Function Test ==="
echo "This test should NEVER launch browsers"

# Source our test functions
source tests/support/test-aws-functions.sh

echo "✅ Mock functions loaded"

# Test 1: aws-sso list (should use mock)
echo "Testing aws-sso list..."
aws-sso list > /dev/null
echo "✅ aws-sso list works"

# Test 2: aws-login without browser
echo "Testing aws-login without browser..."
aws-login tec-man-eng-dev > /dev/null
echo "✅ aws-login without browser works"

# Test 3: aws-console (should mock browser)
echo "Testing aws-console..."
output=$(aws-console 2>&1)
if [[ "$output" == *"Mock browser:"* ]]; then
    echo "✅ aws-console uses mock browser"
else
    echo "❌ aws-console did not use mock browser: $output"
    exit 1
fi

# Test 4: aws-login with console flag
echo "Testing aws-login with console flag..."
output=$(aws-login tec-man-eng-dev -c 2>&1)
if [[ "$output" == *"Mock browser:"* ]]; then
    echo "✅ aws-login -c uses mock browser"
else
    echo "❌ aws-login -c did not use mock browser: $output"
    exit 1
fi

echo "=== All tests passed! No browsers launched! ==="