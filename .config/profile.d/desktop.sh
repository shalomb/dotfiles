#!/bin/sh

# If we're not running interactively, return.
test -t 0 || return 0

: ${BROWSER="$(/usr/bin/which x-www-browser)"}; export BROWSER;
: ${XEDITOR="$(/usr/bin/which gvim)"};          export XEDITOR;

# required by gnome-control-center > 1:3.28
XDG_CURRENT_DESKTOP=GNOME-Classic:GNOME;  export XDG_CURRENT_DESKTOP;
GNOME_SHELL_SESSION_MODE=classic;         export GNOME_SHELL_SESSION_MODE;

# GTK, QT, etc
GTK2_RC_FILES=~/.gtkrc-2.0;               export GTK2_RC_FILES;
GDK_USE_XFT="1";                          export GDK_USE_XFT;
QT_XFT="true";                            export QT_XFT;

# oo.org
OOO_FORCE_DESKTOP='gnome';                export OOO_FORCE_DESKTOP;
SAL_USE_VCLPLUGIN='gnome';                export SAL_USE_VCLPLUGIN;

# Fix for being unable to access the accessibility bus
NO_AT_BRIDGE=1;                           export NO_AT_BRIDGE

GNOME_DESKTOP_SESSION_ID='profile0';      export GNOME_DESKTOP_SESSION_ID;

# Disable user desktop icons
if command -v gsettings &>/dev/null; then
  gsettings set org.gnome.desktop.background show-desktop-icons false
fi
