#!/bin/bash

# vi: filetype=sh:sw=2:tw=2:et:foldmethod=marker:foldmarker={{{,}}}

# set -v -e -x

# This file is to be treated as a stub i.e. it must not source any other files
# except those files under ~/.config/bash/alias.d/. This behaviour must be
# inherited by those files too.

# If not running interactively, return
[[ -n "$PS1" ]] || return
test -t 0       || return

export BASH_ALIASES_SOURCED="$(date +%s)"
export BASH_ALIASES_SOURCED_BY="$BASH_ALIASES_SOURCED_BY|$(ps -p $$ -o pid= -o ppid= -o comm= -o args= -o fuser=) $(date +%s)"

shopt -s nullglob dotglob
alias_files=( ~/.config/bash/alias.d/* );
if (( ${#alias_files[@]} > 0 )); then
  reload "${alias_files[@]}";
fi
shopt -u nullglob dotglob

function add_alias () {
  if alias "$1" &> /dev/null; then
   alias "$1" >> ~/.bash_aliases
  fi
}

alias     ..='cd $(dirname $(pwd -P))'
function  - () { cd -; }

function  apropos () { man -k "$1" | $PAGER; }
function  nohup () { $(type -p nohup) "$@" &> "$(mktemp "$TMP"/.nohup.$$.XXXXXX)" ; }

alias     ..='cd ..'
alias     ...='cd ../..'
alias     ....='cd ../../..'
alias     cd..='cd ..'
alias     cd...='cd ../..'

alias     cls='clear'

alias     e='$EDITOR'

alias     quit=exit

# some vim-like commands
function  :h () {
  if builtin help $1 &> /dev/null; then
    help $1
  elif man $1 &> /dev/null; then
    man $1
  elif info $1 &> /dev/null; then
    info $1
  else
    echo no help sections found >&2
  fi
}

function  f () { find . -name "$@" ; }

alias grep='grep  --colour=auto'
alias egrep='egrep --colour=auto'
alias g='egrep --colour=auto'

alias gvim='command gvim --remote-silent'

alias h='fc -l'
alias j='jobs -l'
alias p='$PAGER'
alias r='fc -s'
alias t='tail -n'

# like the perl join
perljoin () 
{ 
    local jstr="";
    local join="$1"; shift;
    for i; do jstr+="$i$join"; done;
    jstr="${jstr%$join}";
    echo "\"$jstr\""
}

eval "`dircolors -b`"
export    LS_OPTS='--color=auto'
alias     ls='\ls $LS_OPTS'
alias     l='ls -Fhpqs'
alias     l1='\ls -1'
alias     lA='ls -A'
alias     la='ls -aBFilos'
alias     ll='ls -BFilos'
alias     lr='find . | g $*'
alias     lt='ls -lt'

function  llr ()  { find "$PWD" -iname "*$@*" -exec ls -lsdF --color=auto '{}' + | less; }

alias     more=less

alias     o='xdg-open'

alias     pa='ps a -U $USER'
alias     pu='ps au -U $USER'
alias     px='ps aux -U $USER'

alias     tmp='cd $TMP'
alias     timestamp='date +"%Y%m%d.%H%M%S"'

alias     udate='date +"%s"'

alias     d2h="perl -e 'printf qq|%X|, int( shift )'"
alias     d2o="perl -e 'printf qq|%o|, int( shift )'"
alias     d2b="perl -e 'printf qq|%b|, int( shift )'"

alias     h2d="perl -e 'printf qq|%d|, hex( shift )'"
alias     h2o="perl -e 'printf qq|%o|, hex( shift )'"
alias     h2b="perl -e 'printf qq|%b|, hex( shift )'"

alias     o2h="perl -e 'printf qq|%X|, oct( shift )'"
alias     o2d="perl -e 'printf qq|%d|, oct( shift )'"
alias     o2b="perl -e 'printf qq|%b|, oct( shift )'"

alias     ip2bin="perl -le 'print join \" \", map {sprintf \"%08b [%1\\\$X]\", \$_} split /\./, pop'"
alias     whatismyip="wget -q www.whatismyip.com/automation/n09230945.asp -O -"
#alias     myip="lynx -dump http://checkip.dyndns.org | perl -ne 'print /((?:\d{1,3}(?:\.|$)){4})/'"

function  docbrowse   { find /usr/local/share/ -type f -name "*$@*" | $PAGER; }

function  help () {  builtin help "$@" | $PAGER ; }
function  pathgrep () {  perl -le 'print for grep /$ARGV[0]/, map { glob "$_/*" } split /:/, $ENV{PATH}' "$1"; }

function  lif  ()     { if [[ -n "$2" ]]; then egrep -Rsl "$@"; else egrep -sl "$@" *; fi }

function  man         { LESS= /usr/bin/man -P $PAGER $@; }
function  manbrowse   { locate \/man\/ | grep "$1" | $PAGER; }
function  mcd         { mkdir "$@" && builtin cd "$@"; }
alias     md=mcd

function  mkfile ()   {   mkdir -p $(dirname "$@"); touch $@; }

# function rand { echo $(( $RANDOM % ((${2:-$1} - $1 + 1) + $1) )) ; }

function  mkexe       { 
  local file="$1";
  [[ -d "${file%/*}" ]] || mkdir -p "${file%/*}";
  [[ -e "$file" ]]      || touch "$file";
  if [[ ! -e ~/.bin/"${file##*/}" ]]; then
    ln -s "$file" ~/.bin/"${file##*/}";
    chmod 750 ~/.bin/"${file##*/}";
  else
    echo "${file} already exists. overwrite? [y/N]"
    read -s -n 1 a;
    if [[ "$a" == "y" ]]; then
      rm -i ~/.bin/"${file##*/}" && ln -sif "$file" ~/.bin/"${file##*/}";
      chmod 750 ~/.bin/"${file##*/}";
    else 
      echo no;
    fi
  fi
  vim "$file";
  \echo;
}

function  press () {
  local archive="${1%%/}";
  
  if [[ ! -e "$archive" ]]; then shift; fi

  tar cf - "$@" | bzip2 -9v > "$archive.tbz" && stat -c "%n  %s"  "$archive.tbz";
}

function  trmv  ()   { 
  test -n "$NSTR" || NSTR=' '
  test -n "$NREP" || NREP='_'
  for file; do
    echo mv -v "$file" "${file//$NSTR/$NREP}"
  done;
}

function  noswp ()   {
  test "$@" && DIR="$@" || DIR="."
  [[ -d "$DIR" ]] && find "$DIR" -maxdepth 1 -iname "*.sw?" -type f -print -delete;
}

function  setlocale  { printf '\33]701;%s\007' "$@"; }
function  treecp     { tar cpf - "$1" | (cd "$2" ; tar xpf -) ; }
function  vif        { $PAGER $(lif "$@"); }

function  doc ()    { 
  local o;
  local docfiles;
  { o=$(builtin type -a "$1")   ; [[ -n $o ]] && echo -e "TYPE\n-----\n$o"
    o=$(command whereis "$1")   ; [[ -n $o ]] && echo -e "\nWHEREIS\n--------\n$o"
    (
      shopt -s nullglob
      docfiles=( /usr/share/doc/"$1"/* );
      (( ${#docfiles[@]} > 0 )) && { 
        echo -e "\nDOCFILES\n---------\n/usr/share/doc/"$1"/";
        printf "%s\n" "${docfiles[@]##*/}"  | columns; 
      }
    );
    o=$(command man -k "$@")    ; [[ -n $o ]] && echo -e "\nAPROPOS\n--------\n$o"
    o=$(command dpkg -l | perl -lane '$F[1] =~ /'"$1"'/ and print join " ", @F');
                                  [[ -n $o ]] && echo -e "\nPACKAGES\n---------\n$o"
    o=$(dpkg -L $(dpkg -S $(type -p "$1") | awk -F: '{print $1}')); 
                                  [[ -n $o ]] && echo -e "\nPACKAGE FILES\n--------------\n$o";
    o=$(builtin help "$@")      ; [[ -n $o ]] && echo -e "\nHELP\n----\n$o"
    o=$(command man "$@")       ; [[ -n $o ]] && echo -e "\nMANPAGE\n--------\n$o"
    o=$(command info "$@")      ; [[ -n $o ]] && echo -e "\nINFOPAGE\n---------\n$o"
  } 2>/dev/null | $PAGER;
}

function  dirs () {
  [[ -n "$DIRS_N" ]] || DIRS_N=1;
  if [[ -n "$@" ]]; then
    builtin dirs "$@" 
  else
    { \echo -e "This is less.\n   q<N> to goto N\n   q<RETURN> to quit\n"; 
      builtin dirs -v
    } | less -C
    local dir=$( 
        perl -e 'print glob pop' ${DIRSTACK[$(read -p "Which dir? " -s -n $DIRS_N n; echo $n)]} 
      )
    cd $dir && \echo "$PWD"
  fi
}

function  sendkey () {
    if [[ -n $1 ]]; then
        ssh "$1" 'test -d ~/.ssh || mkdir -p ~/.ssh; cat ->> ~/.ssh/authorized_keys' < ~/.ssh/id_rsa.pub
    fi
}

function  reset_screen () {
  printf "set mouse reporting on  \033[?1000h %d\n" $?; # turn mouse reporting on
  printf "set mouse reporting off \033[?1000l %d\n" $?; # turn mouse reporting off
}
#__DISABLED__
#
# function dfp { df -h | perl -lne 'print "-"x67 if ($.=~/1|2/); printf "|%-12s| %4s | %4s | %5s | %8s | %-15s |\n", split /\s+/,$_'/,$_'; '}              #pretty print df -h
# printf '\33]701;%s\007' en_GB.UTF-8                 # set the locale
# printf '\33]50;%s\007' "8x13,xft:Kochi Gothic"      # set funky fonts


# ==================================#
# *  aliases added via add_alias  * #
# ==================================#

alias todo='$EDITOR ~/Desktop/Documents/Notes/TODO.txt'
alias ssh-x='ssh -c arcfour,blowfish-cbc -XC '
alias shu='ssh-x -Y a8037915@homepages.shu.ac.uk'
alias hera='ssh-x -Y hera'
alias hermes='ssh-x -Y hermes'
alias iris='ssh-x -Y iris'
alias techne='ssh-x -Y techne'
alias theos.ath.cx='ssh-x -Y theos.ath.cx'
alias theos='ssh-x -Y theos.ath.cx'
alias foobar='echo foobar'
