" MRU

" [Examples (vim) · junegunn/fzf Wiki]
" (https://github.com/junegunn/fzf/wiki/Examples-(vim)#simple-mru-search)

command! MRU call fzf#run({
  \  'source':  v:oldfiles,
  \  'sink':    'e',
  \  'options': '-m -x +s',
  \  'down':    '40%'})

cabbrev mru <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'MRU' : 'mru')<CR>
