# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.


# return if not running interactively
[[ -z "$PS1" ]] && return
test -z $PS1 && return

# Let everyone know this file was sourced.
#  we'll use it to break cyclic loops.
PROFILE_SOURCED="$(date +%s)"; export PROFILE_SOURCED

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
umask 022

SHELL=$(readlink -f /proc/$$/exe); export SHELL;

if [ -n "$BASH_VERSION" ]; then
  if [[ -z $BASHRC_SOURCED && -r $HOME/.bashrc ]]; then
    source "$HOME/.bashrc"
  fi
fi

if [ -d "$HOME/.bin" ] ; then PATH="$HOME/.bin:$PATH"; fi

XDG_CACHE_HOME="$HOME/.cache";  
export XDG_CACHE_HOME;
XDG_CONFIG_HOME="$HOME/.config"; 
export XDG_CONFIG_HOME
XDG_CONFIG_DIRS="$HOME/.etc/:/etc:/etc/xdg:$XDG_CONFIG_HOME"; 
export XDG_CONFIG_DIRS;
XDG_DATA_HOME="$HOME/.local/share"; 
export XDG_DATA_HOME
XDG_DATA_DIRS="/usr/local/share:/usr/share:$XDG_DATA_HOME"; 
export XDG_DATA_DIRS
XDG_RUNTIME_DIR="$HOME/.tmp"; 
export XDG_RUNTIME_DIR

