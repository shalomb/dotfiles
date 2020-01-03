" Line number settings

" Hybrid line numbers - current line number is absolute
set number relativenumber

augroup numbertoggle
  autocmd!
  autocmd BufEnter,FocusGained,InsertLeave * if &nu | set relativenumber   | endif
  autocmd BufLeave,FocusLost,InsertEnter   * if &nu | set norelativenumber | endif
augroup END

highlight CursorLineNr ctermfg=202
