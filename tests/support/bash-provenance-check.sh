#!/bin/bash
# Provenance checks for goss-bash-provenance.yaml. Exit 0 = pass.
set -u
cfg=~/.config/bash
case "${1:-}" in
bashrc-link) [[ -L ~/.bashrc && $(readlink ~/.bashrc) == .config/bash/bashrc ]] ;;
profile-link) [[ -L ~/.bash_profile && $(readlink ~/.bash_profile) == .config/bash/profile ]] ;;
repo-symlinks) # both tracked as symlinks (mode 120000)
  [[ $(git -C ~/.config/dotfiles ls-files -s .bashrc .bash_profile | cut -c1-6 | sort -u) == 120000 ]]
  ;;
no-remnants) # exit 0 when none of the vendor names appear
  ! rg -qi 'kiro|amazon.?q|qchat' "$cfg"/{bashrc,profile,aliases,enabled,lib}
  ;;
no-vendor-modules) [[ ! -e $cfg/enabled/amazon-q.sh && ! -e $cfg/enabled/kiro-cli.sh ]] ;;
*)
  echo "usage: $0 {bashrc-link|profile-link|repo-symlinks|no-remnants|no-vendor-modules}" >&2
  exit 2
  ;;
esac
