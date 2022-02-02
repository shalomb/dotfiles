" cd.vim "
" Helpers around changing directories

let g:oldpwd = getcwd()

function! s:chpwd(arg, ...)  " as opposed to s:chdir
  if len(a:arg)
    if a:arg ==# '~'
      let l:dir = glob('~/')
    elseif a:arg ==# '-'
      let l:dir = g:oldpwd
    elseif a:arg ==# '.'
      let l:dir = expand('%:p:h')
    elseif a:arg ==# '..'
      let l:dir = glob(expand('%:p:h') . '/..')
    else
      let l:dir = a:arg
    endif
  else
    if !IsGitDir()
      let l:dir = expand('%:p:h')
      execute(':lcd ' . l:dir)
    endif
    let l:dir = GitRoot()
  endif
  let g:oldpwd = getcwd()
  silent execute(':cd ' . l:dir)
  echo(l:dir)
endfunction

command! -bang -nargs=? CD :call s:chpwd(<q-args>)
