"""" Persistent Undo """"""""""""""""""""""""""""""""""""""""""""""""""""""""""

if v:version >= 703   " when undodir was introduced
  set undodir=~/.vim/undo
  set undofile

  au BufWritePre /tmp/* setlocal noundofile
  set undolevels=8192       " maximum number of changes that can be undone
  set undoreload=9216       " maximum number lines to save for undo
                            "  on a buffer reload

  function! ReadUndo()
    let _undofile = &undodir . expand("%:p") . '.undo'

    if filereadable(_undofile)
      silent execute ":rundo " . _undofile
    endif
  endfunc

  function! WriteUndo()
    let _undofile = &undodir . expand("%:p") . '.undo'
    let _undodir = matchstr(_undofile, "^.*\/")

    if !isdirectory(_undodir)
      silent execute "!mkdir -p " . _undodir
    endif
    silent execute "wundo! " . _undofile
  endfunc

  au BufReadPost * call ReadUndo()
  au BufWritePost * call WriteUndo()
endif

