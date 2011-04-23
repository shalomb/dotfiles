# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.

# See /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.
#
# No checks to test whether $0 is being run interactively should be made as
# ?DM and .xinitrc/.xsession spawn the DM non-interactively (with regards
# to us).

# Let everyone know this file was sourced.
#  we'll use it to break cyclic loops.
PROFILE_SOURCED="$(date +%s)"; export PROFILE_SOURCED
PROFILE_SOURCED_BY+=("$(ps -o pid= -o cmd= -p $$) $(date +%s)")

# The default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
umask 022

SHELL=$(readlink -f /proc/$$/exe); export SHELL

# source ~/.bashrc if we're under bash and it hasn't been sourced before
if [ -n "$BASH_VERSION" ]; then
  if [[ -z $BASHRC_SOURCED && -r ~/.bashrc ]]; then
    source "$HOME/.bashrc"
  fi
fi


export LANG="en_GB.UTF-8"
       HOSTNAME="${HOSTNAME:-"$(< /etc/hostname)"}"
export HOSTNAME="${HOSTNAME:-"$(hostname -s)"}"
export HOST="${HOST:-"$HOSTNAME"}"
export TZ='Europe/London'

export EDITOR="${EDITOR:-$(which vim)}"
export VISUAL="$EDITOR"
export XEDITOR="${XEDITOR:-$(which gvim)}"

export GZIP="-9v"
export BZIP2="-9v"

export BROWSER=firefox
#export LESSCHARSET='latin1'
export LESSOPEN='|lesspipe.sh %s'
export LESS=' -RCiJ '

XDG_CACHE_HOME="$HOME/.cache"
XDG_CONFIG_HOME="$HOME/.config"
XDG_CONFIG_DIRS="$HOME/.etc/:/etc:/etc/xdg:$XDG_CONFIG_HOME"
XDG_DATA_HOME="$HOME/.local/share"
XDG_DATA_DIRS="/usr/local/share:/usr/share:$XDG_DATA_HOME"
XDG_RUNTIME_DIR="$HOME/.tmp"
export XDG_CACHE_HOME
export XDG_CONFIG_HOME
export XDG_CONFIG_DIRS
export XDG_DATA_HOME
export XDG_DATA_DIRS
export XDG_RUNTIME_DIR

# gtk
export GTK2_RC_FILES=~/.gtkrc-2.0
export QT_XFT="true"
export GDK_USE_XFT="1"

# oo.org
export OOO_FORCE_DESKTOP='gnome'
export SAL_USE_VCLPLUGIN='gnome'

export MANPATH="$MANPATH:/var/cache/man/:/usr/share/man/:/usr/share/doc/libncurses5-dev/html/man/:/usr/lib/jvm/java-6-sun-1.6.0.06/man/:/usr/lib/jvm/java-6-sun-1.6.0.06/jre/man/"

if [ -d "$HOME/.bin" ] ; then PATH="$HOME/.bin:$PATH"; fi
export PATH="$PATH:/usr/bin/:/bin/:/usr/local/sbin:/usr/sbin:/sbin:/opt/bin:/usr/share/openoffice/bin/:/usr/share/mc/bin/:/usr/local/bin/:/usr/lib/pm-utils/bin/:/usr/lib/klibc/bin/:/usr/lib/jvm/java-6-sun-1.6.0.06/jre/bin/:/usr/lib/jvm/java-6-sun-1.6.0.06/bin/:/usr/lib/Adobe/Reader8/Reader/intellinux/bin/:/usr/lib/Adobe/Reader8/bin/:/usr/lib/Adobe/HelpViewer/1.0/intellinux/bin/"


TMP=/tmp/"$USER"
if [ ! -e "$TMP" ]; then
  old_umask="$(umask)"
  umask 0077
  mkdir -p "$TMP"
  ln -sf "$TMP" "$HOME/.tmp"
  umask "$old_umask"
fi

export TEMP="$TMP"
export TMPDIR="$TMP"
export TMP="$HOME/.tmp"

