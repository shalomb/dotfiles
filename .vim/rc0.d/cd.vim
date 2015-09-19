
"""" cd.vim """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" Keep the CWD of the buffer sane.
"  * by default, keep CWD the directory of the current file
"  * on <leader>cdi, keep CWD of the buffer the directory vim was invoked in
"      * this is vim's default behaviour
"      * let g:invocation_pwd = getcwd() must be set in .{g,}vimrc
"  * on <leader>cdI, keep CWD of all buffers the directory vim was invoked in

let b:pwd_is_invocation_pwd = 0
let g:pwd_is_invocation_pwd = 0

if !exists('g:invocation_pwd')
  if exists("$PWD")
    let g:invocation_pwd = $PWD
  else
    let g:invocation_pwd = getcwd()
    let $PWD = getcwd()
  endif
endif

if !exists('g:pwd')
  let g:pwd = g:invocation_pwd
endif

function! CD()
  let b:cwd = getcwd()

  if exists('b:pwd')
    let b:targetdir = b:pwd
" elseif $PWD != g:invocation_pwd
"   if $PWD != b:cwd
"     let $OLDPWD = b:cwd
"     let g:oldpwd = b:cwd
"   endif
"   let b:targetdir = $PWD
  elseif b:pwd_is_invocation_pwd == 1 || g:pwd_is_invocation_pwd == 1
    if !exists('g:pwd')
      g:pwd = getcwd()
    endif
    let b:targetdir = g:pwd
  elseif bufname("") !~ "://"
    let b:targetdir = expand('%:p:h')
  else
    return
  endif

  if b:targetdir != b:cwd
    execute 'lcd ' . b:targetdir
    let b:oldpwd = b:cwd
  endif
endfunction

autocmd BufEnter * if !exists('b:pwd_is_invocation_pwd') | let b:pwd_is_invocation_pwd=0 | endif | call CD()

nnoremap <silent> <leader>cdi       :let b:pwd_is_invocation_pwd=!b:pwd_is_invocation_pwd<cr>:call CD()<cr>
nnoremap <silent> <leader>cdI       :let g:pwd_is_invocation_pwd=!g:pwd_is_invocation_pwd<cr>:call CD()<cr>
nnoremap <silent> <leader>cdp       :let b:pwd=getcwd()<cr>:call CD()<cr>
nnoremap <silent> <leader>cdP       :let $PWD=getcwd()<cr>:call CD()<cr>
