#!/bin/bash

# SYNOPSIS
#   gcloud aliases

# from https://cloud.google.com/sdk/docs/quickstart-debian-ubuntu
install-gcloud() {
  # Add the Cloud SDK distribution URI as a package source
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

  # Import the Google Cloud Platform public key
  curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

  # Update the package list and install the Cloud SDK
  sudo apt-get update && sudo apt-get install google-cloud-sdk
}

@has-cmd gcloud || return

init-gcloud() {
  local file='/usr/lib/google-cloud-sdk/completion.bash.inc'
  source "$file"
  gcloud info
  echo
  echo "Init complete, Checking authorizations .."
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)"; then
    gcloud auth list
  fi
}

