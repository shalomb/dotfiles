#!/bin/bash

 ##############################################################################
#   ~/.bashrc: executed by bash(1) for non-login shells.                       #
#   See /usr/share/doc/bash/examples/startup-files (in the package bash-doc)   #
#   for examples                                                               #
 ##############################################################################

# If not running interactively, don't do anything
[[ -n "$PS1" ]] || return
test -t 0       || return

# source ~/.profile if 
#  * ~/.bashrc hasn't been sourced before - for interactive shells
#  * it hasn't already been marked as sourced.
if [[ -z $BASHRC_SOURCED ]] || \
   [[ -z $PROFILE_SOURCED && -r ~/.profile ]]; then
  source ~/.profile
fi

export BASHRC_SOURCED="$(date +%s)"
export BASHRC_SOURCED_BY="$BASHRC_SOURCED_BY|$(ps -p $$ -o pid= -o ppid= -o comm= -o args= -o fuser=) $(date +%s)"

export PAGER=$(which less)
export MANPAGER="$PAGER"

export FCEDIT="$EDITOR"

export HISTCONTROL=ignoredups
export HISTFILESIZE=8192
export HISTIGNORE='&:ls: ls *:[bf]g'
export HISTSIZE="$HISTFILESIZE"
export HISTTIMEFORMAT=""
export IGNOREEOF=5
export TIMEFORMAT=$'\nReal: %3lR\tUser: %3lU\tSys: %3lS\tCPU: %3lP'

if type -P screen &> /dev/null; then
  read screen_session _ < <(screen -ls | grep "$PPID\.")
  export screen_session
fi

export TTY="$(tty)"; TTY="${TTY##/dev/}"
export RUNLEVEL="${RUNLEVEL##* }"
export PRERUNLEVEL="${RUNLEVEL%% *}"


# Shell Options
# echo -n "setting shell options .. "
shopt -s cdable_vars
shopt -s cdspell
shopt -s checkhash
shopt -s checkwinsize
shopt -s cmdhist
shopt -s extglob
#shopt -u expand_aliases
shopt -s histappend histreedit histverify
shopt -u huponexit
shopt -s mailwarn
shopt -s no_empty_cmd_completion  # bash>=2.04 only
shopt -s sourcepath
shopt -s progcomp
shopt -s promptvars

set -o braceexpand
set -o hashall
set -o histexpand
set -o ignoreeof
set -o notify
set -o vi
# echo "done"


# ulimits
# echo -n "setting ulimits .. "
# Limit some inadvertent fork bombs.
# ulimit -Sc 0        # core dump file size i.e. no dump file
# ulimit -Sc 128000 # core dump file size
# ulimit -Sd 512000 # data segment size
# ulimit -Se 2      # max. nice value
# ulimit -Sf 512000 # max. files created
# ulimit -Sm 512000 # max. resident set size
# ulimit -Sn 122048 # open files
# ulimit -Ss 128000 # max. stack size
# ulimit -St 45     # soft max. CPU time in seconds
# ulimit -Ht 60     # hard max. CPU time in seconds
#ulimit -Su 512      # soft max. user processes
#ulimit -Hu 768      # hard max. user processes
# ulimit -Sv 512000 # max. virtual memory
# ulimit -Hv 768000
# echo done


if [[ -z "$debian_chroot" && -r /etc/debian_chroot ]]; then
    debian_chroot="$(</etc/debian_chroot)"
fi


case "$TERM" in
  screen*)
    PS1='${debian_chroot:+($debian_chroot)}\[\033[01;35m\]\!\[\033[01;32m\]\T\[\033[01;34m\]\W\[\033[00;35m\]\$\[\033[00;00m\] '
    ;;
  *)
    PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00;37m\]:\[\033[00;34m\]\W\[\033[00;35m\]\$\[\033[00;00m\] '
;;
esac

# If this is an xterm set the title to user@host:dir
case "$TERM" in screen*|xterm*|*rxvt*)
    PROMPT_COMMAND='echo -ne "\033]0;${debian_chroot}${USER}@${screen_session:-$HOSTNAME}:$$: ${PWD/$HOME/~}\007"'
    ;;
*)
    ;;
esac


function set_cdpath () {
  CDPATH="$PWD:.:$OLDPWD:..:~:/media:/mnt"
}

# CDPATH does not seem to expand variables when cd is used
# workaround: get PROMPT_COMMAND to do the expanding
if [[ -n $PROMPT_COMMAND && $PROMPT_COMMAND != *set_cdpath* ]]; then  
    PROMPT_COMMAND="$PROMPT_COMMAND ; set_cdpath ;"
else
  PROMPT_COMMAND="set_cdpath"
fi

# reload - convenience function around source
#   * takes multiple arguments,
function reload () {
  if [[ -n "$@" ]]; then
    for f; do
      [[ -f "$f" && -r "$f" ]] && {
        source "$f"
      }
    done
  else
    reload  /etc/bash_completion  \
            ~/.bash/completion    \
            ~/.bash/aliases
  fi
}

reload  ~/.bash/completion        \
        ~/.bash/bash_aliases


if type -P dircolors &>/dev/null; then
  {
    if [[ -f ~/.dircolors && -r ~/.dircolors ]]; then
      eval "$(dircolors -b ~/.dircolors)"
    fi
  } &> /dev/null
fi


# Remove duplicates, non-existent directories from $VAR pass in.
clean_path () {
  local path
  path=${!1}
  path=(${path//:/ })
  eval "$1=\"$( perl -e ' print join ":", grep -d $_, grep !$s{$_}++, @ARGV ' ${path[@]%*/} )\""
}

clean_path PATH;    export PATH
clean_path MANPATH; export MANPATH


# Right, we're ready to hand over control to the user now!
# Print some informational trivia.
echo -e "\n$BASH ${BASH_VERSION}"

echo -n "last login: "
lastlog -u unop | tail -n +2 | tail -n 1 | sed 's/\ \ \ */ on /g'
echo ""

fortune
echo ""
