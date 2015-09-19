"""" printexpr """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function! PrintFile(fname)
  call system("a2ps " . a:fname . " -o /tmp/fname")
  "call delete(a:fname)
  return v:shell_error
endfunc
set printexpr=PrintFile(v:fname_in)

