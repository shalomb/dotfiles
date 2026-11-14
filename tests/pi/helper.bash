# Shared bats helper: isolated HOME, stub pi/fzf on PATH, source pi libs.
REPO_ROOT="$(cd "${BATS_TEST_DIRNAME}/../.." && pwd)"

pi_test_setup() {
  export HOME="$BATS_TEST_TMPDIR/home"
  mkdir -p "$HOME/.pi/agent/skills" "$HOME/.config/pi-profile" "$BATS_TEST_TMPDIR/bin"
  echo '{}' >"$HOME/.pi/agent/auth.json"
  echo s >"$HOME/.pi/agent/settings.json"
  export PI_AGENT_DIR="$HOME/.pi/agent" PI_PROFILE_DIR="$HOME/.pi/profiles"
  export PI_SETTINGS_FILE="$HOME/.config/pi-profile/settings.yaml"
  export PI_NO_LIMITS=1 PI_LOG="$BATS_TEST_TMPDIR/pi.log"
  unset PI_PROFILE PI_CODING_AGENT_DIR PI_FORCE_TTY PI_NEW_BRANCH
  cat >"$BATS_TEST_TMPDIR/bin/pi" <<'STUB'
#!/bin/bash
echo "$(pwd -P)|${PI_CODING_AGENT_DIR:-}|$*" >>"$PI_LOG"
STUB
  cat >"$BATS_TEST_TMPDIR/bin/fzf" <<'STUB'
#!/bin/bash
mapfile -t lines
printf '%s\n' "${lines[@]}" >"$BATS_TEST_TMPDIR/fzf.in"
idx="${FZF_PICK_ROW:-1}"
[[ $idx -ge 1 && $idx -le ${#lines[@]} ]] || exit 1
echo "${lines[$((idx - 1))]}"
STUB
  chmod +x "$BATS_TEST_TMPDIR"/bin/*
  export PATH="$BATS_TEST_TMPDIR/bin:$PATH"
  # shellcheck source=/dev/null
  source "$REPO_ROOT/.config/bash/enabled/pi.sh"
}

# make_repo <dir> : git repo with one commit
make_repo() {
  git init -q "$1"
  git -C "$1" -c user.email=t@t -c user.name=t -c commit.gpgsign=false commit -q --allow-empty -m init
}
