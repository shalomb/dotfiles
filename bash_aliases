#!/usr/bin/env bash
#set -v -x

shopt -s nullglob dotglob
alias_files=( ~/.config/bash/alias.d/* );
if (( ${#alias_files[@]} > 0 )); then
  reload "${alias_files[@]}";
fi
shopt -u nullglob dotglob

function add_alias () {
  if alias $1 &> /dev/null; then
   alias $1 >> ~/.bash_aliases
  fi
}

alias     ..='cd $(dirname $(pwd -P))'
function  - () { cd -; }

function  apropos () { man -k "$1" | $PAGER; }
function  nohup () { $(which nohup) "$@" &> "$(mktemp $TMP/.nohup.$$.XXXXXX)" ; }

alias     ..='cd ..'
alias     ...='cd ../..'
alias     ....='cd ../../..'

alias     cd..='cd ..'
alias     cls='clear'

alias     e='$EDITOR'

alias     quit=exit

# some vim-like commands
alias     :q=exit

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

export    GREP_COLOR="1;36"
alias     grep='grep --colour=auto'
alias     egrep='egrep --colour=auto'
alias     g='egrep -iE --colour=auto'

alias     h='fc -l'
alias     j='jobs -l'
alias     p='$PAGER'
alias     r='fc -s'
alias     t='tail -n'

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
alias     la='ls -aBFilos'
alias     lA='ls -A'
alias     ll='ls -BFilos'
alias     lr='find . | g $*'
alias     lt='ls -lt'

#if [[ ${BASH_VERSION%%\(*}
#function iname () {
#  local files;
#  for f; do files+=(-iname "*$f*"); done;
#  echo "${files[@]:1}"
#}

function     lsd () { 
  find . -maxdepth ${FIND_DEPTH:-1} -type d -exec \ls "$@" -d {} +
}
function     lsf () {
  find . -maxdepth ${FIND_DEPTH:-1} -type f -iname "*$1*" | xargs ls -d $2
}
function     lsl () {
  find . -maxdepth ${FIND_DEPTH:-1} -type l -iname "*$1*" | xargs ls -d $2
}
function     lso () {
  find . -maxdepth ${FIND_DEPTH:-1} ! -type f ! -type d ! -type l -iname "*$1*" | xargs ls -dF $2;
}

function  llr ()  { find -L "$PWD" -iname "*$@*" -exec \ls -lsdF '{}' + | less; }

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

function docbrowse   { find /usr/local/share/ -type f -name "*$@*" | $PAGER; }

function help () {  builtin help "$@" | $PAGER ; }
function pathgrep () {  perl -le 'print for grep /$ARGV[0]/, map { glob "$_/*" } split /:/, $ENV{PATH}' "$1"; }

function lif  ()     { [[ -n "$2" ]] && egrep -Rsl $@ || egrep -sl $@ * ; }

function man         { LESS= /usr/bin/man -P $PAGER $@; }
function manbrowse   { locate \/man\/ | grep "$1" | $PAGER; }
function mcd         { mkdir "$@" && builtin cd "$@"; }
alias md=mcd

function mkfile ()   {   mkdir -p $(dirname "$@"); touch $@; }

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

function press () {
  local archive="${1%%/}";
  
  if [[ ! -e "$archive" ]]; then shift; fi

  tar cf - "$@" | bzip2 -9 > "$archive.tbz" && stat -c "%n  %s"  "$archive.tbz";
}

function _gvim  ()  {
  local GVIM=$(which gvim)
  if ! $($GVIM --serverlist | grep -iq "^foo$"); then
    $GVIM --servername "foo"
  else
    $GVIM --servername "foo" --remote-send "<ESC>:tabnew<CR>"
  fi
  if [[ -n "$@" ]]; then
    $GVIM --servername "foo" --remote "$@" 2>/dev/null
  fi
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
  [[ -d "$DIR" ]] && find "$DIR" -maxdepth 1 -iname "*.sw?" -type f -print0 | xargs -0 rm -v;
}

function  setlocale  { printf '\33]701;%s\007' "$@"; }
function  treecp     { tar cpf - "$1" | (cd "$2" ; tar xpf -) ; }
function  vif        { $PAGER $(lif "$@"); }

function  doc ()    { 
  { 
      o=$(builtin type -a "$@")   ; [[ -z "$o" ]] || echo -e "\\n_TYPE_\\n$o"
      o=$(command whereis "$@")   ; [[ -z "$o" ]] || echo -e "\\n_WHEREIS_\\n$o"
      o=$(command man -k "$@")    ; [[ -z "$o" ]] || echo -e "\\n_APROPOS_\\n$o"
      o=$(command dpkg -l "*$@*") ; [[ -z "$o" ]] || echo -e "\\n_PORTLS_\\n$o"
      o=$(builtin help "$@")      ; [[ -z "$o" ]] || echo -e "\\n_BUILTIN_\\n$o"
      o=$(command man "$@")       ; [[ -z "$o" ]] || echo -e "\\n_MANPAGE_\\n$o"
      o=$(command locate "/usr" | egrep -- doc | egrep -- "$@" | sort); 
                                    [[ -z "$o" ]] || echo -e "\\n_LOCATE_\\n$o";
      unset o
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

function  calc () { 
  if [[ -n "$@" ]]; then
    perl -le '$_=join"",@ARGV; y/[]/()/; $,=" = ",print $_,eval;' "$@";

  elif [[ "$CV" = "eval" ]]; then 
    perl -MTerm::ReadLine -e '
      $|++; $t=new Term::ReadLine "calc";
      while( defined( $_ = $t->readline(q|> |) ) ) {
        $_ = eval $_;
        $@ and warn $@ or print "$_\n";
      }'

  elif [[ -n "$CV" ]]; then 
    perl -le 'print "$ENV{CV} => " . eval "+$ENV{CV}"'

  else
    if [[ -t 0 ]]; then
      [[ -z $CF ]] && tmp="$TMP/$USER.calc" || tmp="$CF";
      [[ -z $CA || ! -e $tmp ]] && $EDITOR $tmp;
    else
      tmp=$(mktemp $TMP/calc.$$.XXXXXX)
      cat "$@" > $tmp
    fi

    perl -0777 -lpe '
        s/(?<!\\|\;)\s*\n+\s*/; /mg;
        $_ = "$_ # = " . eval " $_ ";
      ' <$tmp;
      echo;

    [[ -t 0 ]] || rm -rf "$tmp"
  fi
}

function sendkey () {
    if [[ -n $1 ]]; then
        ssh "$1" 'test -d ~/.ssh || mkdir -p ~/.ssh; cat ->> ~/.ssh/authorized_keys' < ~/.ssh/id_rsa.pub
    fi
}

function tips () {
  local files;
  local infodir=~/Desktop/tips/;

  if [[ -z $1 ]]; then set -- bash; fi
  
  for f; do files+=( "$infodir"/*"$f"* ); done
  #files=(${files[@]:1})
  echo "${files[@]}"

  cd "$infodir";
  if [[ ! -e $files ]]; then
    vim -p "${files[@]//\*/}"
  else
    less "${files[@]}"
  fi
  cd "$OLDPWD";
}

reset_screen () {
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
