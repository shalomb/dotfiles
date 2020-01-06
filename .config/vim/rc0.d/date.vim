
function! InsertDate(datefmt)
  if a:datefmt =~ "^+"
    let str = system('date +"%FT%T%z" -d "' . a:datefmt . '"')
  else
    let str = strftime('"' . a:datefmt . '"')
  endif

  let str = substitute(str, '\n$', '', '')
  exe "normal! a" . str
endfunction

" call InsertDate("%FT%T%z")
