#!/bin/bash

# SYNOPSIS
#   k3s aliases

install-k3sup() {
  ( cd ~/.local/bin/
    curl -fsSL https://get.k3sup.dev | sh --
    install k3sup ~/.local/bin
  )
  k3sup --help
}

# from https://cloud.google.com/sdk/docs/quickstart-debian-ubuntu
install-k3s() {
  type -P k3sup || install-k3sup
  # SSH pubkey auth to root@localhost needs to be setup
  k3sup install \
    --user root \
    --merge \
    --local-path ~/.kube/config
  # TODO, side effect of using --user root?
  echo 'K3S_KUBECONFIG_MODE="644"' |
    sudo tee -a /etc/systemd/system/k3s.service.env
  sudo systemctl restart k3s.service
  kubectl get namespaces || true
}

@has-cmd k3s || return
