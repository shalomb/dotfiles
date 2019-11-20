"""" MyMap """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"" List maps matching argument(s)
  command! -nargs=* MyMap :!shopt -s nullglob; grep map.*<q-args> ~/.{g,}vimrc ~/.vim/rc*.d/*.vim
  cabbrev mymap <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'MyMap' : 'mymap')<CR>

