" Display vim bundled plugins

let s:source = 'find bundle/ -type f'

command! -bang -nargs=? -complete=dir Bundle
    \ call fzf#vim#files(
    \    g:packer_package_root,
    \    fzf#vim#with_preview(
    \      { 'source': 'find */ \( -iname ".*" -o -iname "*pycache*" -o -iname "*.pyc" \) -prune -o -iname "*" -type f -print',
    \        'options': FZFPreviewOptions('--query='. <q-args>),
    \        'window': 'tabnew'
    \      }
    \    ),
    \    <bang>0
    \  )

command! -bang -nargs=? -complete=dir Readme
    \ call fzf#vim#files(
    \    '~/.config/nvim',
    \    fzf#vim#with_preview(
    \      { 'source': 'find */ \( -iname ".*" \) -prune -o -iname "*readme*" -print',
    \        'options': FZFPreviewOptions('--query='. <q-args>),
    \        'window': 'tabnew'
    \      }
    \    ),
    \    <bang>0
    \  )
