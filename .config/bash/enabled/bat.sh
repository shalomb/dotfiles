#!/bin/bash

install-bat() {
  local latest_tag=$(curl -fsSL 'https://api.github.com/repos/sharkdp/bat/releases/latest' | jq -cer '.tag_name')
  echo "sharkdp/bat/releases/latest reports $latest_tag"
  bat --version | grep "$latest_tag$" || rm -fv ~/.local/bin/bat
  local url="https://github.com/sharkdp/bat/releases/download/$latest_tag/bat_${latest_tag#v}_amd64.deb"
  local file="${url##*/}"
  _TMP=$(mktemp -d)
  ( cd "$_TMP"
    wget -c "$url" -O "$file"
    sudo dpkg -i "$file"
  )
  rm -fr "$_TMP"
}
