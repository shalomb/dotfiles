#!/bin/bash
# Characterises `make test-bash`: it must exit non-zero when ANY goss suite
# fails (fail closed), and exit 0 only when every suite passes.
set -u
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cat >"$tmp/pass.yaml" <<'Y'
command:
  "true":
    exit-status: 0
Y
cat >"$tmp/fail.yaml" <<'Y'
command:
  "false":
    exit-status: 0
Y

rc=0
run() { make -C "$root" --no-print-directory test-bash BASH_SUITES="$*" >"$tmp/out" 2>&1; }

run "$tmp/pass.yaml" || {
  echo "FAIL: all-passing suites should exit 0"
  rc=1
}
run "$tmp/fail.yaml" && {
  echo "FAIL: failing suite exited 0 (fails open)"
  rc=1
}
run "$tmp/fail.yaml" "$tmp/pass.yaml" && {
  echo "FAIL: fail then pass exited 0"
  rc=1
}
run "$tmp/pass.yaml" "$tmp/fail.yaml" && {
  echo "FAIL: pass then fail exited 0"
  rc=1
}
run "$tmp/pass.yaml" "$tmp/fail.yaml" || rg -q 'FAILED' "$tmp/out" || {
  echo "FAIL: failure not reported"
  rc=1
}
[[ $rc -eq 0 ]] && echo "OK: make test-bash fails closed"
exit "$rc"
