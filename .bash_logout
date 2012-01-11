#!/bin/bash

# ~/.config/bash/logout: executed by bash(1) when login shell exits.

# when leaving the console clear the screen to increase privacy
if [[ "$SHLVL" = 1 ]]; then
  type -p clear_console && clear_console -q
  clear   # as a fallback
fi

# append history entries to ~/.config/bash/bash_history
HISTSIZE=8192
HISTTIMEFORMAT=""
HISTFILE=~/.config/bash/bash_history
history -a;


# Archive off older entries if $HISTFILE has too many entries
# BashFAQ #88 - How can I avoid losing any history lines?
#  http://mywiki.wooledge.org/BashFAQ/088

umask 077
max_lines=16384  # 2*$HISTSIZE as HISTTIMEFORMAT takes up odd lines 

linecount=$(wc -l < ~/"$HISTFILE")

if (($linecount > $max_lines)); then
  prune_lines=$(($linecount - $max_lines))
  head -$prune_lines ~/"$HISTFILE" >> "$HISTFILE".archive \
    && sed -e "1,${prune_lines}d"  "$HISTFILE" > "$HISTFILE".tmp$$ \
    && mv "$HISTFILE".tmp$$ "$HISTFILE"
fi
