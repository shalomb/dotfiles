#!/bin/sh

is_locale_available() {
  ! LC_ALL="$1" locale 2>&1 >/dev/null | grep -iq 'locale: Cannot set'
}

set_locale() {
  local locale="$1"
  LANG="$locale"; export LANG;
  LC_ALL="$LANG"; export LC_ALL;
}

# Are our preferences available?
is_locale_available "$LANG"   && return
is_locale_available "$LC_ALL" && set_locale "$LC_ALL" && return

for i in             \
  "$LANG"            \
  "$LC_ALL"          \
  en_GB.UTF-8        \
  en_GB.utf8         \
  en_GB.ISO-8859-15  \
  en_GB.ISO-8859-1   \
  en_US.UTF-8        \
  en_US.utf8         \
  en_US.ISO-8859-15  \
  en_US.ISO-8859-1   \
  C.UTF-8            \
  C                  \
  POSIX              \
  ; do
    is_locale_available "$locale" && set_locale "$locale" && return
done
