#!/bin/bash
# System-level crash-diagnosis setup (needs sudo): packages, /etc config from
# root/etc, auditd rules, NTP. Idempotent. DRY_RUN=1 prints instead of running.
set -eu
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
run() { if [[ ${DRY_RUN:-0} == 1 ]]; then echo "+ $*"; else "$@"; fi; }

run sudo apt-get install -y gdb auditd libc6-dbg systemd-coredump systemd-timesyncd

for f in etc/systemd/coredump.conf.d/50-debug.conf \
         etc/security/limits.d/20-coredump-debian.conf \
         etc/audit/rules.d/50-sigsend.rules; do
  run sudo install -D -m 0644 "$repo/root/$f" "/$f"
done

run sudo augenrules --load
run sudo systemctl enable --now auditd systemd-timesyncd
# A stale future-dated stamp here makes boot set the clock decades ahead.
run sudo rm -f /var/lib/systemd/timesync/clock
