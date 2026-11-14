#!/usr/bin/env bats
load helper

setup() {
  pi_test_setup
  mkdir -p "$HOME/oneTakeda/proj/deep" "$HOME/oneTakedaX" "$HOME/play"
  cat >"$PI_SETTINGS_FILE" <<YAML
default: personal
paths:
  ~/oneTakeda: work
  ~/oneTakeda/proj/special: personal
YAML
}

@test "path under a mapped dir resolves to its profile" {
  run _pi_resolve_profile "$HOME/oneTakeda/proj/deep"
  [ "$status" -eq 0 ]; [ "$output" = work ]
}
@test "the mapped dir itself matches" {
  run _pi_resolve_profile "$HOME/oneTakeda"
  [ "$output" = work ]
}
@test "longest prefix wins" {
  mkdir -p "$HOME/oneTakeda/proj/special/x"
  run _pi_resolve_profile "$HOME/oneTakeda/proj/special/x"
  [ "$output" = personal ]
}
@test "sibling with shared name prefix does not match" {
  run _pi_resolve_profile "$HOME/oneTakedaX"
  [ "$output" = personal ]
}
@test "unmapped path falls back to default" {
  run _pi_resolve_profile "$HOME/play"
  [ "$output" = personal ]
}
@test "default is personal when settings file is missing" {
  rm "$PI_SETTINGS_FILE"
  run _pi_resolve_profile "$HOME/oneTakeda"
  [ "$output" = personal ]
}
@test "PI_PROFILE overrides the path map" {
  PI_PROFILE=personal run _pi_resolve_profile "$HOME/oneTakeda"
  [ "$output" = personal ]
}
@test "symlinked cwd resolves via its physical path" {
  ln -s "$HOME/oneTakeda/proj" "$HOME/play/link"
  cd "$HOME/play/link"
  run _pi_resolve_profile "$PWD"
  [ "$output" = work ]
}
@test "invalid profile in settings is rejected" {
  printf 'default: bogus\n' >"$PI_SETTINGS_FILE"
  run _pi_resolve_profile "$HOME/play"
  [ "$status" -ne 0 ]
}
@test "invalid PI_PROFILE is rejected" {
  PI_PROFILE=bogus run _pi_resolve_profile "$HOME/play"
  [ "$status" -ne 0 ]
}
@test "profile prepare isolates auth.json but links the rest" {
  _pi_profile_prepare work
  p="$PI_PROFILE_DIR/work"
  [ ! -e "$p/auth.json" ]; [ -L "$p/settings.json" ]; [ -L "$p/skills" ]
}
