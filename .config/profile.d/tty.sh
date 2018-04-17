#!/bin/sh

SHELL="`readlink -f /proc/$$/exe`";       export SHELL
TTY=`tty`;                                export TTY

VT=""
pid=$(pidof X || pidof xinit) &&
  VT=`ps -o command= -p "$pid" 2>/dev/null | sed -r 's/.*(vt[0-9]+).*/\1/'`
export VT

runlevel=$(runlevel | awk '{print $2}')
RUNLEVEL=${RUNLEVEL:-$runlevel};          export RUNLEVEL
prerunlevel=$(runlevel | awk '{print $1}')
PRERUNLEVEL=${RUNLEVEL:-$prerunlevel};    export PRERUNLEVEL

