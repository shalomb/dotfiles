" set the background colour of columns 80 onwards
" overflow gutter

function! s:ColourColumn(...)
  let l:args = split(a:1, ' ')
  let l:args += args
  let &colorcolumn = join(range(args[0], args[1]), ",")
endfunction

command! -nargs=* ColourColumn :silent call s:ColourColumn(<q-args>)

cabbrev ccol
    \ <c-r>=(getcmdtype()==':' && getcmdpos()==1
    \ ? 'ColourColumn'
    \ : 'colourcolumn')<CR>

cabbrev colourcolumn
    \ <c-r>=(getcmdtype()==':' && getcmdpos()==1
    \ ? 'ColourColumn'
    \ : 'colourcolumn')<CR>

ColourColumn 80 100

" vim:ft=vim
