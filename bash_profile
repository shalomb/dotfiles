#!/bin/bash

# ~/.bash_profile: executed by bash(1) for login shells.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/login.defs

umask 022

setterm -blength 0

# include .bashrc if it exists
if [[ -r ~/.bashrc ]]; then
  . ~/.bashrc
fi

if [[ "$TTY" == "tty1" ]]; then
  unset TMOUT;            # so that this value does not get propagated
  # todo: get this to timeout a yes/no question so we can
  # work with TMOUT better
  tmout 5 "exec startx > $TMP/startx.log 2>&1" 
  TMOUT=120;       # set console shell to logout after 2 minutes
  clear;
fi

