" quickfix
setlocal nobuflisted

augroup jump_to_last_position
  " [Quickfix window below tabgbar when tagbar is open - fatih/vim-go]
  " (https://github.com/fatih/vim-go/issues/1229)
  autocmd FileType qf wincmd J

  " Note this also affects the Location List window which has a
  " ftype=qf

  autocmd QuickFixCmdPost [^l]* nested cwindow
  autocmd QuickFixCmdPost    l* nested lwindow
augroup end
