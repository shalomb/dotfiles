#!/bin/bash

# ~/.bash_logout: executed by bash(1) when login shell exits.

# when leaving the console clear the screen to increase privacy
if [[ "$SHLVL" = 1 ]]; then
  type -p clear_console && clear_console -q
  clear   # as a fallback
fi

# append history entries to ~/.bash_history
HISTSIZE=8192
HISTTIMEFORMAT=""
HISTFILE=~/.bash_history
history -a;

# Archive off older entries if $HISTFILE gets too big
# BashFAQ #88 - How can I avoid losing any history lines?
#  http://mywiki.wooledge.org/BashFAQ/088

umask 077
max_lines=16384  # 2*$HISTSIZE as HISTTIMEFORMAT takes up odd lines 

linecount=$(wc -l < ~/.bash_history)

if (($linecount > $max_lines)); then
  prune_lines=$(($linecount - $max_lines))
  head -$prune_lines ~/.bash_history >> ~/.bash/bash_history.archive \
    && sed -e "1,${prune_lines}d"  ~/.bash_history > ~/.bash_history.tmp$$ \
    && mv ~/.bash_history.tmp$$ ~/.bash_history
fi
