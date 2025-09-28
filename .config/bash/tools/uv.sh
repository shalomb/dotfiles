#!/bin/bash

install-uv() {
  curl -LsSf https://astral.sh/uv/install.sh | sh
  echo 'eval "$(uv generate-shell-completion bash)"'  > ~/.config/bash/rc.d/uv-completion.sh
  echo 'eval "$(uvx generate-shell-completion bash)" &>/dev/null' > ~/.config/bash/rc.d/uvx-completion.sh
}

PATH="$HOME/.venv/bin/:$PATH"

uv() {
    if [[ $(/usr/bin/pwd -P) == "$HOME" ]]; then
        ( cd ~/.config/dotfiles || exit
          command pwd
          command uv "$@"
        )
    else
        command uv "$@"
    fi
}
