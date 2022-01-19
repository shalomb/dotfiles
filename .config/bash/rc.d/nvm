#!/bin/bash

# Sets things up for the node version manager

install-nvm() {
  local latest_tag=$(curl -fsSL 'https://api.github.com/repos/nvm-sh/nvm/releases/latest' | jq -cer '.tag_name')
  local url="https://raw.githubusercontent.com/nvm-sh/nvm/$latest_tag/install.sh"
  curl -fsSL -o- "$url" | bash
  nvm list
}

NVM_DIR="$HOME/.config/nvm"
if [[ -d $NVM_DIR ]]; then
 export NVM_DIR
 [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"  # This loads nvm
 [[ -s "$NVM_DIR/bash_completion" ]] && source "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
fi
