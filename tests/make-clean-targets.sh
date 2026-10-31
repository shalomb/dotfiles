#!/bin/bash
# Characterises the cleanup targets in the Makefile against a fixture HOME
# containing stub tools, so nothing real is ever cleaned.
# shellcheck disable=SC2329  # fns are called via check()
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
export HOME="$FIX/home" XDG_CONFIG_HOME="$FIX/home/.config" npm_config_cache="$FIX/npm-cache"
# Tool env vars exported by the login shell point at the REAL caches and would
# override the fixture HOME, so drop them, then prove we are fenced in.
unset TF_PLUGIN_CACHE_DIR GOCACHE GOMODCACHE GOPATH XDG_CACHE_HOME XDG_DATA_HOME XDG_STATE_HOME
[[ $HOME == "$FIX"/* ]] || { echo "refusing to run: HOME is not the fixture" >&2; exit 2; }
mkdir -p "$HOME/.local/bin" "$HOME/.cache"
CALLS="$FIX/calls"; : >"$CALLS"

stub() { # stub <name>: records "<name> <args>" in $CALLS and succeeds
  printf '#!/bin/bash\necho "%s $*" >>"%s"\n' "$1" "$CALLS" >"$HOME/.local/bin/$1"
  chmod +x "$HOME/.local/bin/$1"
}
fail=0
check() { if "${@:2}"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
called() { rg -q -- "$1" "$CALLS"; }
run() { (cd "${CWD:-$REPO}" && make -f "$REPO/Makefile" "$@" >"$FIX/make.out" 2>&1); }

# --- python-cleanup must run `uv cache clean` when uv IS installed
stub uv
run python-cleanup
check "python-cleanup runs uv cache prune when uv exists" called '^uv cache prune'

# --- npm-cleanup must not delete a project's files when run from another directory
stub npm
export PATH="$HOME/.local/bin:$PATH"
PROJ="$FIX/proj"; mkdir -p "$PROJ/node_modules"; echo '{}' >"$PROJ/package.json"; echo '{}' >"$PROJ/package-lock.json"
CWD=$PROJ run npm-cleanup
check "npm-cleanup keeps package.json outside dotfiles"      test -f "$PROJ/package.json"
check "npm-cleanup keeps package-lock.json outside dotfiles" test -f "$PROJ/package-lock.json"
check "npm-cleanup keeps node_modules outside dotfiles"      test -d "$PROJ/node_modules"
check "npm-cleanup still cleans the npm cache"               called '^npm cache clean'
check "npm-cleanup explains the skip"                        rg -q 'skipping' "$FIX/make.out"

# --- worktree-cleanup removes only provably-safe worktrees, and `clean` runs it
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
git init -q --bare "$FIX/origin.git"
git clone -q "$FIX/origin.git" "$HOME/oneTakeda/repo" 2>/dev/null
WR=$HOME/oneTakeda/repo
git -C "$WR" commit -q --allow-empty -m "chore: init"; git -C "$WR" branch -M main; git -C "$WR" push -q origin main
for b in safe dirty; do git -C "$WR" worktree add -q -b $b "$WR/.worktrees/$b" main; done
git -C "$WR/.worktrees/safe" push -q origin safe
echo x >"$WR/.worktrees/dirty/new.txt"
run worktree-cleanup
check "worktree-cleanup removes clean pushed worktree" test ! -d "$WR/.worktrees/safe"
check "worktree-cleanup keeps dirty worktree"          test -d "$WR/.worktrees/dirty"
check "clean depends on worktree-cleanup"              bash -c "make -n -f '$REPO/Makefile' clean 2>&1 | rg -q 'prune-worktrees.sh --apply'"

# --- tool-cache-cleanup: wipe regenerable caches, cap the big live ones
C=$HOME/.cache
blob() { mkdir -p "$(dirname "$1")"; head -c 3145728 /dev/zero >"$1"; }   # 3 MB of real blocks
for d in puppeteer opengrep copilot; do blob "$C/$d/data.bin"; done
blob "$C/go-build/aa/obj"
tfp=$C/terraform.d/plugin-cache/registry.terraform.io/hashicorp/aws
for v in 5.1.0 5.2.0 5.3.0; do blob "$tfp/$v/linux_arm64/terraform-provider-aws"; done
stub go; : >"$CALLS"
CACHE_CAP_MB=100000 run tool-cache-cleanup   # far above the actual size
check "tool-cache-cleanup wipes puppeteer"              test ! -e "$C/puppeteer"
check "tool-cache-cleanup wipes opengrep"               test ! -e "$C/opengrep"
check "tool-cache-cleanup wipes copilot"                test ! -e "$C/copilot"
check "under cap: go-build left alone"                  bash -c "! rg -q '^go clean' '$CALLS'"
check "under cap: terraform plugin cache untouched"     test -d "$tfp/5.1.0"
CACHE_CAP_MB=1 run tool-cache-cleanup                    # now well over the cap
check "over cap: go clean -cache runs"                  called '^go clean -cache'
check "over cap: terraform keeps only newest version"   test -d "$tfp/5.3.0" -a ! -d "$tfp/5.2.0" -a ! -d "$tfp/5.1.0"
check "clean depends on tool-cache-cleanup"             bash -c "make -n -f '$REPO/Makefile' clean 2>&1 | rg -q 'puppeteer'"

# --- disk-report: read-only dust summary of the usual hot spots
mkdir -p "$HOME/.local/share/x" "$HOME/oneTakeda/keepme" "$HOME/.cache/keepme"
stub dust; : >"$CALLS"
run disk-report
check "disk-report summarises ~/.cache"       called "dust .*$HOME/.cache\$"
check "disk-report summarises ~/.local"       called "dust .*$HOME/.local\$"
check "disk-report summarises ~/oneTakeda"    called "dust .*$HOME/oneTakeda\$"
check "disk-report never scans ~ itself"      bash -c "! rg -q 'dust .* $HOME\$' '$CALLS'"
check "disk-report stays on one filesystem"   called "dust .*-x .*$HOME/.cache\$"
check "disk-report is time-boxed"             rg -q 'timeout' "$FIX/make.out"
mkdir -p "$HOME/.claude" "$HOME/.pi"; : >"$CALLS"; run disk-report
check "disk-report covers agent state dirs"   called "dust .*$HOME/.claude\$"
check "disk-report skips dirs that do not exist" bash -c "! rg -q workspaces '$CALLS'"
check "disk-report is read-only"              test -d "$HOME/oneTakeda/keepme" -a -d "$HOME/.cache/keepme"
PATH=/usr/bin:/bin run disk-report; rc=$?
check "disk-report fails without dust"        test "$rc" -ne 0
check "disk-report says dust is missing"      rg -q 'dust is not installed' "$FIX/make.out"

# --- new cleanups, all wired into `clean`
stub podman; stub sudo; stub pnpm; : >"$CALLS"
run podman-cleanup
check "podman-cleanup prunes volumes"          called '^podman volume prune'
run journal-cleanup
check "journal-cleanup vacuums the journal"    called 'journalctl --vacuum-size'
run npm-cleanup
check "npm-cleanup prunes the pnpm store"      called '^pnpm store prune'

S=$HOME/.vscode-server/cli/servers; mkdir -p "$S"
for i in 1 2 3 4; do mkdir -p "$S/Stable-$i"; touch -d "$((10-i)) days ago" "$S/Stable-$i"; done
: >"$S/lru.json"
run vscode-server-cleanup
check "vscode-server-cleanup keeps 2 newest"   test -d "$S/Stable-4" -a -d "$S/Stable-3"
check "vscode-server-cleanup drops older"      test ! -e "$S/Stable-2" -a ! -e "$S/Stable-1"
check "vscode-server-cleanup keeps lru.json"   test -f "$S/lru.json"

mkdir -p "$HOME/.claude/projects/p" "$HOME/.claude/file-history/h"
for f in "$HOME/.claude/projects/p/old.jsonl" "$HOME/.claude/file-history/h/old"; do echo x >"$f"; touch -d "90 days ago" "$f"; done
run agent-state-cleanup
check "agent-state-cleanup drops old non-session state" test ! -e "$HOME/.claude/file-history/h/old"
check "agent-state-cleanup keeps sessions"              test -f "$HOME/.claude/projects/p/old.jsonl"

mkdir -p "$FIX/gocache/aa"; head -c 3145728 /dev/zero >"$FIX/gocache/aa/obj"
TMP_GOCACHE="$FIX/gocache" CACHE_CAP_MB=1 run tool-cache-cleanup
check "tool-cache-cleanup shrinks over-cap /tmp gocache" test ! -e "$FIX/gocache/aa"
for t in podman-cleanup journal-cleanup vscode-server-cleanup agent-state-cleanup; do
  check "clean depends on $t" bash -c "make -n -f '$REPO/Makefile' clean 2>&1 | rg -q -- '$t|$(case $t in podman*) echo 'volume prune';; journal*) echo vacuum;; vscode*) echo 'cli/servers';; agent*) echo 'file-history';; esac)'"
done

exit $fail
