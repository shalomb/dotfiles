#!/bin/bash

[[ $- == *i* ]] || return

if command -v keychain >/dev/null 2>&1; then
  eval "$(keychain --eval --quiet ~/.ssh/id_ed25519)"
fi

PATH="$PATH:/opt/homebrew/Cellar/keychain/2.9.6/bin/"
[[ $- == *i* ]] && keychain -l
[[ $- == *i* ]] && ssh-add -l

function idun() {
  ssh-retry -t idun '~/.local/bin/tmuxie code'
}

export PATH="~/.bin:/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

reload() {
  source ~/.bashrc
}

alias ll='ls -l'
alias lld='ls -ld'

export GPG_TTY="$(tty)"
export SSH_AUTH_SOCK=$(gpgconf --list-dirs agent-ssh-socket)
gpgconf --launch gpg-agent

# Claude

export PATH="$PATH:/opt/homebrew/opt/node@18/bin"

export LDFLAGS="-L/opt/homebrew/opt/node@18/lib"
export CPPFLAGS="-I/opt/homebrew/opt/node@18/include"

. "$HOME/.local/bin/env"
