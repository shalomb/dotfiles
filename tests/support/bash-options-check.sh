#!/bin/bash
# Runs a probe inside a fresh interactive shell. Usage: $0 {shopts|modes|clean-path|noninteractive}
probe() { setsid bash -i -c "source ~/.bashrc >/dev/null 2>&1; $1" </dev/null 2>&1; }
case "${1:-}" in
  shopts) probe 'shopt -p histverify histreedit cdspell cdable_vars checkhash mailwarn no_empty_cmd_completion sourcepath huponexit; true' ;;
  modes)  probe 'set -o | rg "^(vi|ignoreeof) "; echo IGNOREEOF=$IGNOREEOF' ;;
  clean-path) probe 'P=/usr/bin:/usr/bin:/nonexistent-dir:/bin; clean_path P; echo RESULT=$P' ;;
  noninteractive) bash -c 'source ~/.bashrc >/dev/null 2>&1; shopt -p cdspell' ;;
  *) echo "usage: $0 {shopts|modes|clean-path|noninteractive}" >&2; exit 2 ;;
esac
