" Highlight extraneous whitespace (at EOL, etc).

" https://stackoverflow.com/a/31822230/742600
augroup ExtraneousWhiteSpace
  autocmd! * <buffer>

  " [Highlight unwanted spaces | Vim Tips Wiki | FANDOM powered by Wikia]
  " (http://vim.wikia.com/wiki/VimTip396)
  autocmd BufEnter,InsertLeave <buffer> match ExtraneousWhitespace /\v(\S\zs\s+$| +\zs\t|\t\ze +)/
  autocmd InsertEnter          <buffer> match ExtraneousWhitespace /\v\s+\%#\@<!$/
  " autocmd InsertLeave          <buffer> redraw!

  autocmd BufCreate,BufWritePre  <buffer> silent! %s/\v\s+$//ge
augroup end

" TODO Fix the following to work on colorscheme changes
"      This currently throws a
"      E28: No such highlight group name ExtraneousWhitespace
" autocmd ColorScheme *
highlight ExtraneousWhitespace ctermbg=darkred guibg=red
