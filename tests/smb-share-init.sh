#!/bin/bash
# .config/smb-share/INIT: deploys the read-only guest SMB share + its nftables
# guard from root/etc. Packages come from apt/dpkg--set-selections, NOT here.
set -u
repo=$(cd "$(dirname "$0")/.." && pwd)
INIT="${INIT:-$repo/.config/smb-share/INIT}"
fail=0
check() { if eval "$2"; then echo "ok   - $1"; else echo "FAIL - $1"; fail=1; fi; }

out=$(DRY_RUN=1 bash "$INIT" 2>&1); rc=$?
check "dry run exits 0"                       "[[ $rc -eq 0 ]]"
check "deploys smb.conf"                      "grep -q 'install .*root/etc/samba/smb.conf' <<<\"\$out\""
check "deploys nft guard rules"               "grep -q 'install .*nftables-smb-guard.nft' <<<\"\$out\""
check "deploys guard systemd unit"            "grep -q 'install .*smb-guard.service' <<<\"\$out\""
check "validates smb.conf before reload"      "grep -q 'testparm' <<<\"\$out\""
check "enables guard before smbd reload"      "[[ \$(grep -n 'enable --now smb-guard' <<<\"\$out\" | cut -d: -f1) -lt \$(grep -n 'reload-config' <<<\"\$out\" | cut -d: -f1) ]]"
check "does not install packages itself"     "! grep -q 'apt' <<<\"\$out\""

# Managed files: the security properties we promised, asserted on the source of truth.
conf="$repo/root/etc/samba/smb.conf"
share=$(awk '/^\[unop\$\]/{f=1;next} /^\[/{f=0} f' "$conf" 2>/dev/null)
check "unop\$ share is read-only"             "grep -Eq '^\s*read only = yes' <<<\"\$share\""
check "unop\$ share limited to Parallels net" "grep -Eq '^\s*hosts allow = 10\.211\.55\.0/24' <<<\"\$share\""
check "unop\$ share denies other hosts"       "grep -Eq '^\s*hosts deny = ALL' <<<\"\$share\""
check "unop\$ share is not writable"          "! grep -Eqi '^\s*(writable|writeable|write list)' <<<\"\$share\""
check "smb.conf parses (testparm)"            "testparm -s '$conf' >/dev/null 2>&1"
guard="$repo/root/etc/nftables-smb-guard.nft"
check "guard does not flush the whole ruleset" "! grep -Eq '^\s*flush ruleset' '$guard'"
check "guard drops 445 outside the subnet"    "grep -Eq 'tcp dport \{ 139, 445 \}.*saddr != 10\.211\.55\.0/24.*drop' '$guard'"
check "guard unit runs before smbd"           "grep -q '^Before=smbd.service' '$repo/root/etc/systemd/system/smb-guard.service'"
for p in samba nftables; do
  check "package $p in dpkg--set-selections"  "grep -Eq '^$p[[:space:]]+install' '$repo/.config/apt/dpkg--set-selections'"
done
exit $fail
