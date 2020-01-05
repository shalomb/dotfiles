" Make the active window standout visually

augroup ActiveWindow
  autocmd!
  autocmd VimEnter,WinEnter,BufWinEnter,FocusGained * setlocal cursorline | ColourColumn 72 80
  autocmd WinLeave,BufLeave,FocusLost   * setlocal nocursorline | set colorcolumn=0
augroup END
