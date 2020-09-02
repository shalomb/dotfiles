" Locate

" [Examples (vim) · junegunn/fzf Wiki]
" (https://github.com/junegunn/fzf/wiki/Examples-(vim)#locate-command-integration)

command! -nargs=1 -bang Locate call fzf#run(fzf#wrap(
  \ {'source': 'locate <q-args>', 'options': '-m'}, <bang>0))

cabbrev locate <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Locate' : 'locate')<CR>
