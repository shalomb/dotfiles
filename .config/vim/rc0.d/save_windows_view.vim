"""" Save Windows View """"""""""""""""""""""""""""""""""""""""""""""""""""""""
"" http://stackoverflow.com/questions/4251533

if v:version >= 700
  au BufLeave * let b:winview = winsaveview()
  au BufEnter * if(exists('b:winview')) | call winrestview(b:winview) | endif
endif
