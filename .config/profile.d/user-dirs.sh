#!/bin/sh

XDG_CACHE_HOME="$HOME/.cache";            export XDG_CACHE_HOME;
XDG_CONFIG_HOME="$HOME/.config";          export XDG_CONFIG_HOME;
XDG_CONFIG_DIRS="$HOME/.etc/:/etc:/etc/xdg:$XDG_CONFIG_HOME";
                                          export XDG_CONFIG_DIRS;
XDG_DATA_HOME="$HOME/.local/share";       export XDG_DATA_HOME;
XDG_DATA_DIRS="/usr/local/share:/usr/share:$XDG_DATA_HOME";
                                          export XDG_DATA_DIRS;
XDG_RUNTIME_DIR="/run/user/$(id -u)";     export XDG_RUNTIME_DIR;

# NOTE
# These are also set in and read from
# ~/.config/user-dirs.dirs. Also update that file.

XDG_DESKTOP_DIR="$HOME/private";              export XDG_DESKTOP_DIR;
XDG_DOCUMENTS_DIR="$HOME/private/documents";  export XDG_DOCUMENTS_DIR;
XDG_DOWNLOAD_DIR="$HOME/scratch";             export XDG_DOWNLOAD_DIR;
XDG_MUSIC_DIR="$HOME/private/music";          export XDG_MUSIC_DIR;
XDG_PICTURES_DIR="$HOME/private/pictures";    export XDG_PICTURES_DIR;
XDG_PUBLICSHARE_DIR="$HOME/public";           export XDG_PUBLICSHARE_DIR;
XDG_TEMPLATES_DIR="$HOME/private/templates";  export XDG_TEMPLATES_DIR;
XDG_VIDEOS_DIR="$HOME/private/videos";        export XDG_VIDEOS_DIR;
