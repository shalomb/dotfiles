" Fix where syntax highlighting randomly stops working

augroup syntax_hl_fix
  autocmd!
  autocmd BufEnter * :syntax sync fromstart
  autocmd InsertLeave,InsertEnter * :syntax sync minlines=20
augroup end
