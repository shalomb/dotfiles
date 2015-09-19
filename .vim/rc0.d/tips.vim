"""" tips """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"  Edits the file named as the argument in the ~/Desktop/info directory.
function! s:tips(arg)
  cd ~/Desktop/tips/
  let l:files=split(glob("*".a:arg."*"), "\n")

  if len(l:files)
    for l:file in l:files
      execute "split " . l:file
    endfor
  else
    silent execute "split " . a:arg
    echo "New File : " . a:arg
  endif

endfunc

command! -nargs=1 Tips :silent call s:tips(<q-args>)
cabbrev tips <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Tips' : 'tips')<CR>

