"""" Persistent Undo """""""""""""""""""""""""""""""""""""""""""""""""""""""""

set undodir=~/.cache/nvim/undo
set undofile

au BufReadPre,BufWritePre /tmp/*,/dev/shm/*,*/pass.*/* setlocal noundofile noswapfile nobackup nowritebackup

set undolevels=8192       " maximum number of changes that can be undone
set undoreload=9216       " maximum number lines to save for undo

function! s:ShouldSkipUndo() abort
  if get(g:, 'pass_redact_mode', 0) || !&l:undofile
    return 1
  endif
  let l:path = expand('%:p')
  return l:path =~# '^/tmp/\|^/dev/shm/\|/pass\.[^/]\+/'
endfunction

function! ReadUndo()
  if s:ShouldSkipUndo()
    return
  endif
  let _undofile = &undodir . expand("%:p") . '.undo'

  if filereadable(_undofile)
    silent execute ":rundo " . _undofile
  endif
endfunc

function! WriteUndo()
  if s:ShouldSkipUndo()
    return
  endif
  let _undofile = &undodir . expand("%:p") . '.undo'
  let _undodir = matchstr(_undofile, "^.*\\/")

  if !isdirectory(_undodir)
    silent execute "!mkdir -p " . _undodir
  endif
  silent execute "wundo! " . _undofile
endfunc

au BufReadPost * call ReadUndo()
au BufWritePost * call WriteUndo()
