#!/bin/bash

function list-ssh-connections {
  pgrep -u "$USER" 'ssh' | xargs ps fuw -p
}
