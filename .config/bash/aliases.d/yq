#!/bin/bash

type -a yq &>/dev/null || return

# Ensure yq(1) returns yaml output (the input is YAML after all)
function yq() {
  command yq -y "$@"
}
