# ~/.bash_logout: executed by bash(1) when login shell exits.

# when leaving the console clear the screen to increase privacy
if [[ "$SHLVL" = 1 ]]; then
  type -p clear_console && clear_console -q
  clear   # as a fallback
fi

# append history entries to ~/.bash_history
HISTTIMEFORMAT=""
HISTFILE=~/.bash_history
history -a;
