" https://github.com/garbas/vim-snipmate

" s <C-J> - <Plug>snipMateNextOrTrigger

" Make v1 default as v0 is deprecated now
let g:snipMate = { 'snippet_version' : 1 }

" Tab is over-polluted with many plugins contending to use it
" Tab is evil?!
imap <C-j> <Plug>snipMateNextOrTrigger
smap <C-j> <Plug>snipMateNextOrTrigger

command! -bang -nargs=? -complete=dir Snippets
    \ call fzf#vim#files(
    \    g:vimdir,
    \    fzf#vim#with_preview(
    \      { 'source': 'find . \( -iname "undo" \) -prune -o -type f -iname "*snippet*" -print',
    \        'options': FZFPreviewOptions('--query='. <q-args>),
    \        'window': 'tabnew'
    \      }
    \    ),
    \    <bang>0
    \  )

cabbrev snippets    <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Snippets' : 'snippets')<CR>
