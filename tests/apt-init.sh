#!/bin/bash
# .config/apt/INIT must keep installs lean: no recommends/suggests (apt AND apt-get),
# profile packages marked manual so autoremove never reaps them, config deployed.
# DRY_RUN=1 prints instead of running, so nothing is installed or downloaded.
set -u
repo=$(cd "$(dirname "$0")/.." && pwd)
INIT="${INIT:-$repo/.config/apt/INIT}"
CONF="$repo/root/etc/apt/apt.conf.d/default.conf"
fail=0
check() { if eval "$2"; then echo "ok   - $1"; else echo "FAIL - $1"; fail=1; fi; }

out=$(DRY_RUN=1 bash "$INIT" 2>&1); rc=$?
check "dry run exits 0"                          "[[ $rc -eq 0 ]]"
check "dry run only prints the keyring fetches"  "! grep -Eq '^(Reading|Selecting|Setting up|--[0-9])' <<<\"\$out\""
check "installs with --no-install-recommends"    "grep -q 'apt install .*--no-install-recommends' <<<\"\$out\""
check "installs profile packages"                "grep -q 'apt install .* git ' <<<\"\$out\""
check "marks profile packages manual"            "grep -q 'apt-mark manual .* git ' <<<\"\$out\""
check "deploys apt.conf.d/default.conf to /etc"  "grep -q 'install .*root/etc/apt/apt.conf.d/default.conf /etc/apt/apt.conf.d/default.conf' <<<\"\$out\""
check "deploy happens before the install"        "[[ \$(grep -n 'default.conf' <<<\"\$out\" | head -1 | cut -d: -f1) -lt \$(grep -n 'apt install' <<<\"\$out\" | head -1 | cut -d: -f1) ]]"
check "apt skips recommends"                     "grep -q '^APT::Install-Recommends \"false\"' '$CONF'"
check "apt skips suggests"                       "grep -q '^APT::Install-Suggests \"false\"' '$CONF'"
check "apt-get skips recommends"                 "grep -q '^APT::Get::Install-Recommends \"false\"' '$CONF'"
check "apt-get skips suggests"                   "grep -q '^APT::Get::Install-Suggests \"false\"' '$CONF'"
check "make apt runs INIT explicitly"            "make -n -C '$repo' apt 2>&1 | grep -q 'apt/INIT'"
exit $fail
