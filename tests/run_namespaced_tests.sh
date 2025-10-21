#!/bin/bash
# Test runner for namespaced agent commands

set -euo pipefail

echo "🧪 Running namespaced agent command tests..."

# Change to project root
cd "$(dirname "$0")/.."

# Run the tests
python3 -m pytest tests/test_agent_namespaced_commands.py -v

echo "✅ All namespaced command tests passed!"