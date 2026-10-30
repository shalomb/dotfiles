#!/bin/bash
# AGENT_CONTEXT: Asserts which LSP servers attach to a Python buffer in headless nvim.
# Usage: tests/nvim/python-lsp.sh <expected-type-server> [unexpected-server]
# Honours NVIM_PYTHON_LSP (ty|pyright) like lua/config/lsp.lua does.
set -eu -o pipefail
expect=${1:?expected server}; reject=${2:-}
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf '[project]\nname="t"\nversion="0"\n' >"$tmp/pyproject.toml"
printf 'x: int = "oops"\n' >"$tmp/t.py"
out=$(cd "$tmp" && timeout 30 nvim --headless t.py \
  -c 'lua vim.wait(15000, function() return #vim.lsp.get_clients({bufnr=0, name="'"$expect"'"}) > 0 end, 200)' \
  -c 'lua io.stdout:write(table.concat(vim.tbl_map(function(c) return c.name end, vim.lsp.get_clients({bufnr=0})), ",")) ' \
  -c 'qa!' 2>/dev/null)
echo "attached: $out"
[[ ",$out," == *",$expect,"* ]] || { echo "FAIL: $expect not attached"; exit 1; }
[[ -z $reject || ",$out," != *",$reject,"* ]] || { echo "FAIL: $reject attached"; exit 1; }
echo PASS
