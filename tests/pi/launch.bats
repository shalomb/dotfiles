#!/usr/bin/env bats
load helper

setup() {
  pi_test_setup
  mkdir -p "$HOME/oneTakeda/p" "$HOME/play"
  printf 'default: personal\npaths:\n  ~/oneTakeda: work\n' >"$PI_SETTINGS_FILE"
  make_repo "$HOME/play/repo"
  git -C "$HOME/play/repo" worktree add -q -b feat/a "$HOME/play/repo/.worktrees/feat-a"
  echo ".worktrees" >>"$HOME/play/repo/.git/info/exclude"
}

@test "work dir launches with the work profile" {
  cd "$HOME/oneTakeda/p"
  pi --foo
  grep -q "|$PI_PROFILE_DIR/work|--foo" "$PI_LOG"
}
@test "elsewhere launches with the personal profile" {
  cd "$HOME/play"
  pi --foo
  grep -q "|$PI_PROFILE_DIR/personal|--foo" "$PI_LOG"
}
@test "PI_PROFILE override wins over the path" {
  cd "$HOME/oneTakeda/p"
  PI_PROFILE=personal pi x
  grep -q "|$PI_PROFILE_DIR/personal|x" "$PI_LOG"
}
@test "auth.json is not shared into the profile" {
  cd "$HOME/play"; pi x
  [ ! -e "$PI_PROFILE_DIR/personal/auth.json" ]
}
@test "env does not leak into the calling shell" {
  cd "$HOME/play"; pi x
  [ -z "${PI_CODING_AGENT_DIR:-}" ]
}
@test "args => no chooser" {
  cd "$HOME/play/repo"; PI_FORCE_TTY=1 pi x
  [ ! -f "$BATS_TEST_TMPDIR/fzf.in" ]
}
@test "main checkout, bare pi => chooser" {
  cd "$HOME/play/repo"; PI_FORCE_TTY=1 FZF_PICK_ROW=1 pi
  [ -f "$BATS_TEST_TMPDIR/fzf.in" ]
  grep -q "feat/a" "$BATS_TEST_TMPDIR/fzf.in"
}
@test "linked worktree => no questions asked" {
  cd "$HOME/play/repo/.worktrees/feat-a"; PI_FORCE_TTY=1 pi
  [ ! -f "$BATS_TEST_TMPDIR/fzf.in" ]
  grep -q "feat-a|$PI_PROFILE_DIR/personal|$" "$PI_LOG"
}
@test "--no-resume skips the chooser and is not forwarded" {
  cd "$HOME/play/repo"; PI_FORCE_TTY=1 pi --no-resume
  [ ! -f "$BATS_TEST_TMPDIR/fzf.in" ]
  ! grep -q -- "--no-resume" "$PI_LOG"
}
@test "no TTY => no chooser" {
  cd "$HOME/play/repo"; pi </dev/null
  [ ! -f "$BATS_TEST_TMPDIR/fzf.in" ]
}
@test "chooser: pick existing worktree => cd + --continue" {
  cd "$HOME/play/repo"; PI_FORCE_TTY=1 FZF_PICK_ROW=3 pi
  grep -q "feat-a|.*|--continue" "$PI_LOG"
}
@test "chooser: new worktree => created and named" {
  cd "$HOME/play/repo"; PI_FORCE_TTY=1 FZF_PICK_ROW=2 PI_NEW_BRANCH=chore/g pi
  [ -d "$HOME/play/repo/.worktrees/chore-g" ]
  grep -q "chore-g|.*|--name chore/g" "$PI_LOG"
}
@test "chooser: here => plain launch in cwd" {
  cd "$HOME/play/repo"; PI_FORCE_TTY=1 FZF_PICK_ROW=1 pi
  grep -q "repo|$PI_PROFILE_DIR/personal|$" "$PI_LOG"
}
@test "chooser: registry offers /resume and uses --resume" {
  cat >"$BATS_TEST_TMPDIR/bin/pi-find" <<STUB
#!/bin/bash
echo '[{"id":"u-1","cwd":"$HOME/play/repo/.worktrees/feat-a","status":"lost"}]'
STUB
  chmod +x "$BATS_TEST_TMPDIR/bin/pi-find"
  cd "$HOME/play/repo"; PI_FORCE_TTY=1 FZF_PICK_ROW=4 pi
  grep -q "|--resume u-1" "$PI_LOG"
  grep -q "feat/a \[lost\]" "$BATS_TEST_TMPDIR/fzf.in"
}
@test "pi-profile and friends are retired" {
  ! type pi-profile pi-work pi-personal 2>/dev/null
}
