#!/bin/bash

# SYNOPSIS
#   k9s aliases


install-k9s() {
  local latest_tag=$(curl -fsSL 'https://api.github.com/repos/derailed/k9s/releases/latest' | jq -cer '.tag_name')
  local  url="https://github.com/derailed/k9s/releases/download/$latest_tag/k9s_Linux_x86_64.tar.gz"
  ( cd "/tmp";
    wget -qc "$url" -O "k9s.tar.gz"
    tar xf "k9s.tar.gz"
    install k9s ~/.local/bin
    k9s version
    rm "k9s.tar.gz"
  )
}
