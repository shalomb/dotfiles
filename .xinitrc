#!/bin/sh

[[ -r ~/.config/profile ]] && source ~/.config/profile

exec dbus-launch --exit-with-session i3
