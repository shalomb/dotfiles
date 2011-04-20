#!/bin/sh
TTY=`tty | awk -F '/' '{ print $3 }'`
export TTY
# exec dbus-launch --exit-with-session startfluxbox
exec dbus-launch --exit-with-session ~/.fluxbox/startup
