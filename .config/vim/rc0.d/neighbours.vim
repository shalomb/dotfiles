" neighbours
" List files in the same directory
" https://github.com/junegunn/fzf/wiki/Examples-(vim)#fuzzy-search-files-in-parent-directory-of-current-file

command! -bang -nargs=? -complete=dir Neighbours
    \ call fzf#vim#files(
    \    expand('%:h:p'),
    \    fzf#vim#with_preview(
    \      { 'source': 'find * -type f',
    \        'options': FZFPreviewOptions('--query='. <q-args>),
    \        'window': 'tabnew'
    \      }
    \    ),
    \    <bang>0
    \  )

cabbrev neighbours    <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Neighbours' : 'neighbours')<CR>
