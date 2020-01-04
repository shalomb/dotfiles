let b:colorcolumn = &colorcolumn
augroup ActiveWindow
  autocmd!
  autocmd VimEnter,WinEnter,BufWinEnter,BufEnter,FocusGained * setlocal cursorline | ColourColumn 72 80
  autocmd WinLeave,BufLeave,FocusLost   * setlocal nocursorline | set colorcolumn=0
augroup END

highlight CursorLineNr term=bold cterm=bold ctermfg=202 ctermbg=NONE
highlight CursorLine   term=bold cterm=bold ctermbg=NONE
highlight CursorColumn term=bold cterm=bold ctermbg=208 ctermfg=black
