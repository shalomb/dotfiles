""""" Reset Cursor Position """"""""""""""""""""""""""""""""""""""""""""""""""""
" http://vim.wikia.com/wiki/Restore_cursor_to_file_position_in_previous_editing_session

function! ResCur()
  if line("'\"") <= line("$")
    normal! g`"
    return 1
  endif
endfunction

augroup resCur
  autocmd!
  autocmd BufWinEnter * call ResCur()
augroup END

