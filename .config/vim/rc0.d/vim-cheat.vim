" Display vim tweaks and cheats

command! -bang -nargs=? -complete=dir Tweaks
    \ call fzf#vim#files(
    \    g:vimdir,
    \    fzf#vim#with_preview(
    \      { 'source': 'find rc*d/**.vim -type f',
    \        'options': FZFPreviewOptions('--query='. <q-args>),
    \        'window': 'tabnew'
    \      }
    \    ),
    \    <bang>0
    \  )

cabbrev tweaks    <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Tweaks' : 'tweaks')<CR>
