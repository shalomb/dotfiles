#!/bin/bash

# emit pwd(1) and also copy $PWD to the clipboard
function pwd() {
  builtin pwd |
    tee /dev/stderr |
    tee ~/.cache/dir-selected |
    {
      if command -v pbcopy &>/dev/null; then
        pbcopy
      elif command -v xclip &>/dev/null; then
        xclip -in
      fi
    }
}
