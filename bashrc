# ~/.bashrc: executed by bash(1) for non-login shells.
# see /usr/share/doc/bash/examples/startup-files (in the package bash-doc)
# for examples

export LANG="en_GB.UTF-8";

# If not running interactively, don't do anything
[ -z "$PS1" ] && return


# be careful setting anything in $0
# it gets propogated into the user's xsession

# echo -n "setting environment .. "

export TZ='Europe/London';

# CDPATH: see workaround with PROMPT_COMMAND later on
function set_cdpath () {
  export CDPATH="$PWD:.:$OLDPWD:..:~:/media:/mnt:/tmp:/"
}
export MANPATH=$MANPATH:"/var/cache/man/:/usr/share/man/:/usr/share/doc/libncurses5-dev/html/man/:/usr/lib/jvm/java-6-sun-1.6.0.06/man/:/usr/lib/jvm/java-6-sun-1.6.0.06/jre/man/"
# echo $(locate */man/* | grep -ioE '.*/man/' | sort -r | uniq | tr $'\n' ':')
export PATH=~/.bin:$PATH:/usr/bin/:/bin/:/usr/local/sbin:/usr/sbin:/sbin:/opt/bin:/usr/share/openoffice/bin/:/usr/share/mc/bin/:/usr/local/bin/:/usr/lib/pm-utils/bin/:/usr/lib/klibc/bin/:/usr/lib/jvm/java-6-sun-1.6.0.06/jre/bin/:/usr/lib/jvm/java-6-sun-1.6.0.06/bin/:/usr/lib/Adobe/Reader8/Reader/intellinux/bin/:/usr/lib/Adobe/Reader8/bin/:/usr/lib/Adobe/HelpViewer/1.0/intellinux/bin/ # additional paths

export GZIP="-9v"
export BZIP2="-9v"

export BROWSER=firefox
#export LESS="-CiJ"
#export LESSCHARSET='latin1'
export LESSOPEN='|lesspipe.sh %s'
export LESS=' -RCiJ '

# colourise manpages
export LESS_TERMCAP_mb=$'\E[01;31m'
export LESS_TERMCAP_md=$'\E[01;37m'
export LESS_TERMCAP_me=$'\E[0m'
export LESS_TERMCAP_se=$'\E[0m'
export LESS_TERMCAP_so=$'\E[01;44;33m'
export LESS_TERMCAP_ue=$'\E[0m'
export LESS_TERMCAP_us=$'\E[01;32m'

export PAGER=$(which less)
export MANPAGER="$PAGER"
export EDITOR="${EDITOR:-$(which vim)}"
export VISUAL="$EDITOR"
export FCEDIT="$EDITOR"
export XEDITOR="${XEDITOR:-$(which gvim)}"

export HISTCONTROL=ignoredups
export HISTIGNORE='&:ls: ls *:[bf]g'
export HISTFILESIZE=65535
export HISTSIZE=$HISTFILESIZE
export HISTTIMEFORMAT="";
export IGNOREEOF=5
export INPUTRC=~/.inputrc

# gtk
export GTK2_RC_FILES=~/.gtkrc-2.0
export QT_XFT=true
export GDK_USE_XFT=1

# oo.org
export OOO_FORCE_DESKTOP='gnome'
export SAL_USE_VCLPLUGIN='gnome'

read screen_session _ < <(screen -ls | grep "$PPID\.");
export screen_session;

export TTY=$(tty); TTY=${TTY##/dev/}
export RUNLEVEL="${RUNLEVEL##* }"; 
export PRERUNLEVEL="${RUNLEVEL%% *}"

TMP=/tmp/"$USER.$TTY"
if [[ ! -e "$TMP" ]]; then
  mkdir -p "$TMP";
  ln -sf "$TMP" ~/.tmp;
fi

#export TMP="${TMP:-~/.tmp}"
export TMP=~/.tmp
export TEMP="$TMP"
export TMPDIR="$TMP"

# echo done

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
#ulimit -Sc 128000 # core file size
#ulimit -Sd 512000 # data segment size
#ulimit -Se 2      # max. nice value
#ulimit -Sf 512000 # max. files created
#ulimit -Sm 512000 # max. resident set size
#ulimit -Ss 128000  # max. stack size
#ulimit -Sn 122048   # open files
#ulimit -St 45     # max. proc time
#ulimit -Ht 60
#ulimit -Su 224    # # of processes
#ulimit -Hu 256
#ulimit -Sv 512000 # max. virtual memory
#ulimit -Hv 768000
# echo done

type -P lesspipe &>/dev/null && eval "$(lesspipe)"

if [[ -z "$debian_chroot" && -r /etc/debian_chroot ]]; then
    debian_chroot="$(</etc/debian_chroot)"
fi

#export PS1='\[\n${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h:\[\033[01;34m\]\W\[\033[01;33m\]\$\[\033[00m\] '
case "$TERM" in
  screen)
    PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00;37m\]:\[\033[00;34m\]\W\[\033[00;35m\]\$\[\033[00;00m\] '
    ;;
  *)
    PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00;37m\]:\[\033[00;34m\]\W\[\033[00;35m\]\$\[\033[00;00m\] '
;;
esac

# If this is an xterm set the title to user@host:dir
case "$TERM" in screen|xterm*|*rxvt*)
    PROMPT_COMMAND='echo -ne "\033]0;${debian_chroot}${USER}@${screen_session:-$HOSTNAME}:$$: ${PWD/$HOME/~}\007"'
    ;;
*)
    ;;
esac


# CDPATH does not seem to expand variables when cd is used
# workaround: get PROMPT_COMMAND to do the expanding
if [[ -n $PROMPT_COMMAND ]]; then
  PROMPT_COMMAND="$PROMPT_COMMAND ; set_cdpath ;"
else
  PROMPT_COMMAND="set_cdpath"
fi

function reload () {
  if [[ -n "$@" ]]; then
    for f; do
      [[ -f "$f" && -r "$f" ]] && {
        source "$f"
      }
    done
  else
    reload ~/.bash_aliases /etc/bash_completion
  fi
}

reload /etc/bash_completion ~/.bash_aliases 

function clean_path () {
  local path;
  path=${!1};
  path=(${path//:/ })
  eval "export $1=\"$( perl -e ' print join ":", grep -d $_, grep !$s{$_}++, @ARGV ' ${path[@]%*/} )\""
}


clean_path PATH
clean_path MANPATH

echo -e "\n$BASH ${BASH_VERSION}"
echo -n "last login: "
lastlog -u unop | tail -n +2 | tail -n 1 | sed 's/\ \ \ */ on /g'
echo ""
fortune
echo ""

function aplay_rand () {
  wavs=($(locate *.wav))
  aplay "${wavs[(($RANDOM%${#wavs[@]}))]}"
}

_expand () { :; }
