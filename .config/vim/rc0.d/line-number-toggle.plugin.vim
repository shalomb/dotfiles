" Line number settings

" Hybrid line numbers - current line number is absolute
set number relativenumber

augroup numbertoggle
  autocmd!
  autocmd BufEnter,CmdLineLeave,FocusGained,InsertLeave * if &nu | set relativenumber   | redraw | endif
  autocmd BufLeave,CmdLineEnter,FocusLost,InsertEnter   * if &nu | set norelativenumber | redraw | endif
augroup END

highlight LineNr ctermbg=NONE
