#!/bin/bash
# Behavioural check for lib/03-environment.sh: tell gpg-agent about the current
# terminal (updatestartuptty) when there is one, so pinentry-tty prompts in the
# right pane; never when there is none. Uses a fake gpg-connect-agent, so the
# real agent and its passphrase cache are never touched.
set -u
LIB="${1:-$HOME/.config/bash/lib/03-environment.sh}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir "$work/bin"
printf '#!/bin/sh\necho "$@" >> %s/calls\n' "$work" > "$work/bin/gpg-connect-agent"
chmod +x "$work/bin/gpg-connect-agent"

run_lib() { PATH="$work/bin:$PATH" bash -c "source '$LIB'"; }

# With a pty
: > "$work/calls"
PATH="$work/bin:$PATH" script -qec "bash -c \"source '$LIB'\"" /dev/null >/dev/null 2>&1
if rg -q 'updatestartuptty' "$work/calls"; then echo "tty: updatestartuptty called"; else echo "tty: NOT called"; fi

# Without a tty
: > "$work/calls"
run_lib </dev/null >/dev/null 2>&1
if rg -q 'updatestartuptty' "$work/calls"; then echo "notty: called (wrong)"; else echo "notty: not called"; fi
