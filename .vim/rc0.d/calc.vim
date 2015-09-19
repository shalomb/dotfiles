"""" Calc """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" VT1235 - a calc command
command! -nargs=+ Calc :perl VIM::Msg(<args>)
:cabbrev calc <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Calc' : 'calc')<CR>

