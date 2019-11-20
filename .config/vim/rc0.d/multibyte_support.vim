"""" Multibyte Support """"""""""""""""""""""""""""""""""""""""""""""""""""""""
set fileencodings=utf-8,latin-1 " encode files in latin1 and utf-8
if has("multi_byte")
  if &termencoding == ""
    let &termencoding = &encoding
  endif
  set encoding=utf-8
  setglobal fileencoding=utf-8
  setglobal nobomb
  set fileencodings=utf-8,latin1
else
  echoerr "Multibyte capabilities are not compiled in"
endif

