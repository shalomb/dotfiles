#!/bin/bash

tldr-install() {
  sudo npm install -g tldr
  tldr ls  # update cache too
}
