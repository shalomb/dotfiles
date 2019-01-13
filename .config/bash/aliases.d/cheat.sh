#!/bin/bash

cheat() {
  local topic="$1"; shift;
  local IFS="+"
  local search_term="$*"
  curl "cht.sh/$topic/$search_term"
}

gen_cheat_completions() {

  {
    echo ansible ansible-playbook bash c cpp dig go java javascript \
        jq js kubeadm kubectl minikube mtr mysql nginx node perl \
        ping postgres postgresql python sh shell sql

    perl -le '
      print for
        map { s@.+/@@; $_ }
        grep /\w/,
        map { glob "$_/*" }
        split /:/, $ENV{PATH}
    '
  } | sort -u
}

cheat_topics=()

__cheat_completion(){
  local cur="${COMP_WORDS[COMP_CWORD]}";
  local completions=()
  if (( ${#cheat_topics[@]} == 0 )); then
    cheat_topics=( $(gen_cheat_completions) )
  fi
  if [[ $cur ]]; then
    for cheat_topic in ${cheat_topics[@]}; do
      if [[ $cheat_topic == $cur* ]]; then
        completions+=( "$cheat_topic" )
      fi
    done
  fi
  COMPREPLY=( $(compgen -W "${completions[*]}" -- "$cur" ) );
}

complete -o bashdefault -o default -F __cheat_completion cheat
