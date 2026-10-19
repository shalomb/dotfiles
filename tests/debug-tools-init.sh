#!/bin/bash
# .config/debug-tools/INIT: deploys root/etc config + enables services. Packages
# come from apt/dpkg--set-selections, NOT from this script.
set -u
repo=$(cd "$(dirname "$0")/.." && pwd)
INIT="${INIT:-$repo/.config/debug-tools/INIT}"
fail=0
check() { if eval "$2"; then echo "ok   - $1"; else echo "FAIL - $1"; fail=1; fi; }

out=$(DRY_RUN=1 bash "$INIT" 2>&1); rc=$?
check "dry run exits 0"                     "[[ $rc -eq 0 ]]"
check "deploys coredump config"             "grep -q 'install .*coredump.conf.d/50-debug.conf' <<<\"\$out\""
check "deploys core limit"                  "grep -q 'install .*20-coredump-debian.conf' <<<\"\$out\""
check "deploys audit rules"                 "grep -q 'install .*50-sigsend.rules' <<<\"\$out\""
check "loads audit rules"                   "grep -q 'augenrules --load' <<<\"\$out\""
check "enables auditd + timesyncd"          "grep -q 'enable --now auditd systemd-timesyncd' <<<\"\$out\""
check "removes stale timesync clock"        "grep -q 'rm -f /var/lib/systemd/timesync/clock' <<<\"\$out\""
check "does not install packages itself"    "! grep -q 'apt' <<<\"\$out\""
for p in gdb auditd libc6-dbg systemd-coredump systemd-timesyncd; do
  check "package $p in dpkg--set-selections" "grep -Eq '^$p[[:space:]]+install' '$repo/.config/apt/dpkg--set-selections'"
done
exit $fail
