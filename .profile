# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
umask 022

# return if not running interactively
[[ -z "$PS1" ]] && return
test -z $PS1 && return

SHELL=$(readlink -f /proc/$$/exe)

if [ -n "$BASH_VERSION" ]; then
  if [[ -f $HOME/.bashrc && -r $HOME/.bashrc ]]; then
    source "$HOME/.bashrc"
  fi
fi

if [ -d "$HOME/.bin" ] ; then PATH="$HOME/.bin:$PATH"; fi

XDG_DATA_DIRS="/usr/share:/usr/local/share"
XDG_CONFIG_DIRS="/etc:/etc/xdg"
