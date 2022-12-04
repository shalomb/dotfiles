" Settings for editing bash scripts

" Under ale.vim syntax checking is incorrectly done by sh(1) if the
" filetype=sh. We therefore overrdide this and set filetype=bash for
" bash scripts.

" Not sure why $VIMRUNTIME/syntax/sh.vim doesn't handle this case correctly.

" https://stackoverflow.com/a/13445254/742600

function s:set_ft_bash()
  let b:is_bash = 1
  setfiletype bash
  set filetype=bash
endfunction

augroup bashfiletype
  au! BufRead,BufNewFile *bash* call <SID>set_ft_bash()
  au! BufRead,BufNewFile *
    \ if getline(1) =~ '\<bash$' |
    \   call <SID>set_ft_bash()  |
    \ endif
augroup END
