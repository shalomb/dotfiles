" underlinetag.vim

augroup UnderlineTag
  autocmd!
  autocmd BufEnter,InsertLeave * UnderlineTagOn
  autocmd InsertEnter          * UnderlineTagOff
augroup END
