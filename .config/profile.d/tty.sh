#!/bin/sh

SHELL="$(readlink -f /proc/$$/exe)";      export SHELL
TTY=$(tty || true);                       export TTY

VT=""
pid=$(pidof X || pidof xinit) &&
  VT=$(ps -o command= -p "$pid" 2>/dev/null | sed -r 's/.*(vt[0-9]+).*/\1/')
export VT

# Runlevel not needed on modern systems (systemd)
# RUNLEVEL and PRERUNLEVEL can be set manually if needed

