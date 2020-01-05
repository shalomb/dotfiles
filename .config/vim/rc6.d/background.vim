" Keep background tranparent under urxvt
"
" Setting 'syntax on' causes the background

augroup TransparentBackground
  autocmd!
  autocmd VimEnter,WinEnter,BufWinEnter * highlight Normal ctermbg=NONE
augroup END
