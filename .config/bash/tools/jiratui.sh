#!/bin/bash

jiratui() {
  JIRA_TUI_CONFIG_FILE="$HOME/.config/jiratui/config.yaml" command uvx jiratui "$@"
}
