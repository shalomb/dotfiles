highlight ExtraWhitespace ctermbg=red

augroup unwantedspace
  au!

  au BufNewFile,BufCreate,BufRead,BufWritePre  <buffer> silent! %s///ge
  au BufNewFile,BufCreate,BufRead,BufWritePre  <buffer> silent! %s/\v\s+$//ge

  " [Highlight unwanted spaces | Vim Tips Wiki | FANDOM powered by Wikia]
  " (http://vim.wikia.com/wiki/VimTip396)
  au InsertEnter * match ExtraWhitespace /\s\+\%#\@<!$/
  au InsertLeave * match ExtraWhitespace /\s\+$/
augroup end

