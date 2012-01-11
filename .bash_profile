#!/bin/bash

 #######################################################################
#   ~/.config/bash/profile: executed by bash(1) for login shells.       #
#     Installed at ~/.bash_profile for legacy reasons.                  #
#                                                                       #
#   See /usr/share/doc/bash/examples/startup-files for examples;        #
#     these files are located in the bash-doc package.                  #
 #######################################################################

[[ ${-//[!i]/} ]] || return

# profiling
export BASH_PROFILE_SOURCED="$BASH_PROFILE_SOURCED|$(date +%s)"
export BASH_PROFILE_SOURCED_BY="$BASH_PROFILE_SOURCED_BY|$(ps -p $$ -o pid= -o ppid= -o comm= -o args= -o fuser=) $(date +%s)"


# the default umask is set in /etc/login.defs
umask 022

setterm -blength 0

if [[ -r ~/.config/bash/bashrc ]]; then
  source ~/.config/bash/bashrc
fi

if [[ ${TTY:-$(tty | sed 's@/dev/@@')} == tty1 ]]; then
  unset TMOUT
  tmout 5 "exec startx > $TMP/startx.log 2>&1" 
  TMOUT=120
  clear
fi

