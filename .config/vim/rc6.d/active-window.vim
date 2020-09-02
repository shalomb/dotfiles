" Make the active window standout visually

augroup ActiveWindow
  autocmd!
  autocmd WinEnter,FocusGained * setlocal cursorline   | ColourColumn 72 80
  autocmd WinLeave,FocusLost   * setlocal nocursorline | set colorcolumn=0
augroup END
