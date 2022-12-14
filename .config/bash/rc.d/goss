#!/bin/bash

# SYNOPSIS
#   goss aliases

arch=$(uname -m)
arch="${arch//aarch64/arm64}"

install-goss() {
  local latest_tag=$(curl -fsSL 'https://api.github.com/repos/aelsabbahy/goss/releases/latest' | jq -cer '.tag_name')
  echo "aelsabbahy/goss/releases/latest reports $latest_tag"
  goss --version | grep "$latest_tag$" || mv -v ~/.local/bin/goss{,.old}
  local url="https://github.com/aelsabbahy/goss/releases/download/$latest_tag/goss-linux-$arch"
  ( cd ~/.local/bin/
    test -x goss || wget -c "$url" -O goss-"$latest_tag"
    ln -sf "goss-$latest_tag" "goss"
    chmod +x goss
  )
}
