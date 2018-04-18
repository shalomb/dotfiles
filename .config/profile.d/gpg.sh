#!/bin/sh

# Do not use gnome-keyring to prompt to unlock keys
GPG_TTY=$(tty);  export GPG_TTY;
