#!/bin/bash


function resolve_host {
  local hostname=
  local host="$1"
  local line=$(host "$host")
  local ip=

  if [[ $line = *"has address"* ]]; then
    read hostname _ _ ip _ <<<"$line"
  elif [[ $line = *"domain name pointer"* ]]; then
    read _ _ _ _ hostname <<<"$line"
    resolve_host "$hostname"
    return
  fi

  if [[ -z $hostname && -z $ip ]]; then
    ip_re='^[0-9]{0,3}\.[0-9]{0,3}\.[0-9]{0,3}\.[0-9]{0,3}$'
    if [[ $host =~ $ip_re ]]; then
      ip="$host"
    else
      hostname="$host"
    fi
  fi

  [[ $hostname ]]       && echo -e "${hostname%.}."
  [[ $hostname = *.* ]] && echo -e "${hostname%.}"
  [[ ${hostname%%.*} ]] && echo -e "${hostname%%.*}"
  [[ $ip ]]             && echo -e "$ip"
}


function ssh_hostkey {

  local action=
  local host=
  local hostnames=()
  
  if (( $# == 0 )); then
    action="refresh"
  elif (( $# == 1 )); then
    action="$1";
  elif (( $# == 2 )); then
    action="$1";
    host="$2" 
  elif (( $# >2 )); then
    echo "Wrong number of arguments, must be <=2." >&2
  fi

  if [[ -z $host ]]; then
    last="$(history | tail -n 2 | sed -n 1p)"
    if [[ $last ]]; then
      ip="$(perl -lne 'print for /((?:\d{1,3}(?:\.|\b)){4})/' "$last" 2>/dev/null)";
      if [[ -z $ip ]]; then
        read _ _ host <<<"$last"
        read -p "Host is '$host' [y/N]?"
        if [[ $REPLY = [yY] ]]; then
          host="$host"
        else
          return
        fi
      fi
    fi
  fi

  hostnames=( $(resolve_host "$host") )
  for host in "${hostnames[@]}"; do
    echo "ssh-host-key $action $host" 1>&2;
    ssh-host-key "$action" "$host"
  done
}

alias ssh_hostkey_add='ssh_hostkey add'
alias ssh_hostkey_remove='ssh_hostkey remove'

# ssh "$host" 'exit' 2>&1 | \
#       tr -d '\r' | \
#       perl -F":|\s" -lane 'print "@F[-1] $F[-2]" if /Offending key/i' | \
#       sort -rn | \
#       while read lineno file; do 
#         set -x
#         sed -i "$lineno"d "$file"; 
#         set +x
#       done

# ssh-copy-id "$host"
