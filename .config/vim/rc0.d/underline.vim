" [Underline with dashes automatically]
" (http://vim.wikia.com/wiki/Underline_using_dashes_automatically)

function! s:Underline(chars)
  let chars = empty(a:chars) ? '-' : a:chars
  let nr_columns = virtcol('$') - 1
  let uline = repeat(chars, (nr_columns / len(chars)) + 1)
  put =strpart(uline, 0, nr_columns)
endfunction

command! -nargs=? Underline call s:Underline(<q-args>)
cabbrev underline Underline
