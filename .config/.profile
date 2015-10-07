#!/bin/sh

 ##############################################################################
#   ~/.profile: executed by the command interpreter for login shells           #
#   (including bash when invoked as a --login shell).                          #
#                                                                              #
#   For non-interactive shells, this file is not read by bash(1),              #
#   if ~/.bash_profile or ~/.bash_login exists.                                #
#                                                                              #
#   See /usr/share/doc/bash/examples/startup-files for examples.               #
#   the files are located in the bash-doc package.                             #
#                                                                              #
#   Avoid bashisms at all costs!! This file is to be sourced by any POSIX      #
#   complaint shell (dash, ksh, zsh, etc), so portable scripting here is key.  #
#                                                                              #
#   No checks to test whether $0 is being run interactively should be made as  #
#   ?DM and .xinitrc/.xsession spawn the DM non-interactively (with regards    #
#   to us).                                                                    #
 ##############################################################################

#   Let everyone know this file was sourced.
#    we'll use it to break never-ending cyclic loops.
PROFILE_SOURCED="`date +%s`";
PROFILE_SOURCED_BY="$PROFILE_SOURCED_BY|`ps -p $$ -o pid= -o ppid= -o comm= -o args= -o fuser=` `date +%s`";
export PROFILE_SOURCED;
export PROFILE_SOURCED_BY;


# The default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
umask 022

SHELL="`readlink -f /proc/$$/exe`";       export SHELL
TTY=`tty`;                                export TTY
VT=`ps -o command= -p $(pidof X) | sed -r 's/.*(vt[0-9]+).*/\1/'`

# Environment Variables
XDG_CACHE_HOME="$HOME/.cache";            export XDG_CACHE_HOME;
XDG_CONFIG_HOME="$HOME/.config";          export XDG_CONFIG_HOME;
XDG_CONFIG_DIRS="$HOME/.etc/:/etc:/etc/xdg:$XDG_CONFIG_HOME";
                                          export XDG_CONFIG_DIRS;
XDG_DATA_HOME="$HOME/.local/share";       export XDG_DATA_HOME;
XDG_DATA_DIRS="/usr/local/share:/usr/share:$XDG_DATA_HOME";
                                          export XDG_DATA_DIRS;
XDG_RUNTIME_DIR="$HOME/.tmp";             export XDG_RUNTIME_DIR;

BROWSER="`which x-www-browser`";          export BROWSER;
EDITOR="${EDITOR:-"`which vim`"}";        export EDITOR;
VISUAL="$EDITOR";                         export VISUAL;
XEDITOR="${XEDITOR:-"`which gvim`"}";     export XEDITOR;

GZIP="-9v";                               export GZIP;
BZIP2="-9v";                              export BZIP2;

# GTK, QT, etc
GTK2_RC_FILES=~/.gtkrc-2.0;               export GTK2_RC_FILES;
GDK_USE_XFT="1";                          export GDK_USE_XFT;
QT_XFT="true";                            export QT_XFT;

# oo.org
OOO_FORCE_DESKTOP='gnome';                export OOO_FORCE_DESKTOP;
SAL_USE_VCLPLUGIN='gnome';                export SAL_USE_VCLPLUGIN;

#HOME="`getent passwd "$USER" | awk -F: '{print $6}'`";
#                                         export HOME;
#HOMEPATH="${HOME}";                      export HOMEPATH;
# Fix for being unable to access the accessibility bus
NO_AT_BRIDGE=1

HOSTNAME="${HOSTNAME:-"`cat /etc/hostname`"}";
HOSTNAME="${HOSTNAME:-"`hostname -s`"}";  export HOSTNAME;
HOST="${HOST:-"$HOSTNAME"}";              export HOST;

LANG="en_GB.UTF-8";                       export LANG;
LC_ALL="en_GB.UTF-8";                     export LC_ALL;
TZ='Europe/London';                       export TZ;

if [ -d "$HOME/.bin" ] ; then PATH="$HOME/.bin:$PATH"; fi
PATH="$PATH:/usr/bin/:/bin/:/usr/local/sbin:/usr/sbin:/sbin:/opt/bin"
PATH="$PATH:/usr/local/bin/:/usr/lib/pm-utils/bin/"; 
                                          export PATH;

# Redirect $TMP to ~/.tmp
TMP=/tmp/"$USER"
if [ ! -e "$TMP" ]; then
  old_umask="`umask`"
  umask 0077
  mkdir -p "$TMP"
  ln -sf "$TMP" "$HOME/.tmp"
  umask "$old_umask"
fi

   TMP="$HOME/.tmp"; export    TMP;
  TEMP="$TMP";       export   TEMP;
TMPDIR="$TMP";       export TMPDIR;

# Shell Specifics
# We now go on to setup the env. for the interactive command shell.

# If we're not running interactively, return.
test -t 0 || return

GREP_COLOR="1;36";                        export GREP_COLOR;
GREP_COLORS="${GREP_COLOR:-"1;36"}";      export GREP_COLORS;

INPUTRC=~/.inputrc;                       export INPUTRC;

LESSCHARSET='utf-8';                      export LESSCHARSET;
LESSHISTFILE="$XDG_CACHE_HOME/lesshst";   export LESSHISTFILE;
LESSHISTSIZE="512";                       export LESSHISTSIZE;
LESSKEY="$XDG_CONFIG_HOME/less/lesskey";  export LESSKEY;
LESS=' -RCiJ';                            export LESS;
type -p lesspipe &>/dev/null && eval "$(lesspipe)";
                                          export LESSOPEN;
# colourise manpages
# Begin blink
export LESS_TERMCAP_mb=$'\E[01;31m';      export LESS_TERMCAP_mb;
# begin bold
export LESS_TERMCAP_md=$'\E[01;37m';      export LESS_TERMCAP_md;
# end mode
export LESS_TERMCAP_me=$'\E[0m';          export LESS_TERMCAP_me;
# begin standout mode
export LESS_TERMCAP_so=$'\E[01;44;33m';   export LESS_TERMCAP_so;
# end standout-mode
export LESS_TERMCAP_se=$'\E[0m';          export LESS_TERMCAP_se;
# begin underline
export LESS_TERMCAP_ue=$'\E[0m';          export LESS_TERMCAP_ue;
# end underline
export LESS_TERMCAP_us=$'\E[01;32m';      export LESS_TERMCAP_us;

MANPAGER="${PAGER:-"less"}";              export MANPAGER;
MANPATH="$MANPATH:/usr/share/man/:/var/cache/man/"; export MANPATH

GNOME_DESKTOP_SESSION_ID='profile0';      export GNOME_DESKTOP_SESSION_ID;
