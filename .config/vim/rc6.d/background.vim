" Keep background tranparent under urxvt
"
" Setting 'syntax on' causes the background

augroup TransparentBackground
  autocmd!
  autocmd Syntax * highlight Normal ctermbg=NONE
augroup END
