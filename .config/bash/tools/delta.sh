#!/bin/bash

# Name

# Description

# Usage

export DELTA_FEATURES='+side-by-side +line-numbers'
export DELTA_PAGER='less --tabs=2 -Rn'
export GIT_PAGER='delta'
export GIT_CONFIG_NOSYSTEM=1

source <(delta --generate-completion bash)

function test-delta {
  git show
  git diff
  git add -p
  git reflog -p
}
