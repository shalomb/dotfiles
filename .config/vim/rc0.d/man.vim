"""" man """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
runtime ftplugin/man.vim
:cabbrev man <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Man' : 'man')<CR>

