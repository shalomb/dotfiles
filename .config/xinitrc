#!/bin/sh

# Under xdm(1), it appears the environment is not setup
# appropriately, so source ~/.profile
[ "$TMP" = "" ] && source ~/.profile

script="${0##*/}"
args="$@"
session=${1:-i3}
tmpfile="$TMP/$script.log"

log() {
  echo "`date +%FT%T.%N` $script '$args' $$ $PPID : $@"
}

start_desktop() {
  log "Starting $session"
  log "pwd : `pwd`"
  log "env : `env`"

  [[ -r ~/.config/profile ]] && source ~/.config/profile

  setxkbmap -option ctrl:nocaps &
  # xbindkeys
  # setxkbmap -option ctrl:nocaps -option altwin:swap_alt_win &

  exec dbus-launch --exit-with-session i3

  log "Ending $session"
}

start_desktop >> "$tmpfile"

