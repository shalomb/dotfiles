#!/usr/bin/env bats
# The fast gate's shellcheck runner must actually run: it once died silently on
# its first file because ((total++)) returns 1 under set -e when total is 0.

setup() {
  work="$(mktemp -d)"
  mkdir -p "$work/.config/bash"
  runner="$BATS_TEST_DIRNAME/run-shellcheck.sh"
}

teardown() { rm -rf "$work"; }

@test "shellcheck runner reports every clean file and passes" {
  printf '#!/bin/bash\necho "a"\n' >"$work/.config/bash/a.sh"
  printf '#!/bin/bash\necho "b"\n' >"$work/.config/bash/b.sh"
  cd "$work"
  run bash "$runner"
  [ "$status" -eq 0 ]
  [[ "$output" == *"All 2 files passed"* ]]
}

@test "shellcheck runner fails on a file with a finding" {
  printf '#!/bin/bash\necho "ok"\n' >"$work/.config/bash/a.sh"
  printf '#!/bin/bash\nrm $1\n' >"$work/.config/bash/bad.sh"
  cd "$work"
  run bash "$runner"
  [ "$status" -ne 0 ]
  [[ "$output" == *"1 of 2 files failed"* ]]
}
