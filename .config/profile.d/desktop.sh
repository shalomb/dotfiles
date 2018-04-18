#!/bin/sh

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

