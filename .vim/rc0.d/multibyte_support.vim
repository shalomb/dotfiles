"""" Multibyte Support """"""""""""""""""""""""""""""""""""""""""""""""""""""""
set fileencodings=latin1,utf-8 " encode files in latin1 and utf-8
if has("multi_byte")
  if &termencoding == ""
    let &termencoding = &encoding
  endif
  set encoding=utf-8
  setglobal fileencoding=utf-8 bomb
  set fileencodings=ucs-bom,utf-8,latin1
endif

