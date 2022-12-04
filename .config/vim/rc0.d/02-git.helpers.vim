" git.vim
" Helpers around git

function! IsGitDir()
  let l:output = systemlist('git rev-parse --is-inside-work-tree 2> /dev/null')
  if len(l:output) && l:output[0] ==# 'true'
    return 1
  endif
  return 0
endfunction

function! GitRoot()
  return systemlist('git rev-parse --show-toplevel 2>/dev/null')[0]
endfunction
