" Support exchanging content with external programs

" nnoremap <silent> <leader>>         :new /tmp/exchange<cr>ggP`]a<cr><Esc>"_dGgg:w!<cr> " :close<cr>
" nnoremap <silent> <leader><         :new ~/.tmp/exchange<cr>ggyG<Esc>:w!<cr>:close<cr>

nnoremap <silent> <leader>>           :write! $TMP/exchange<cr>
nnoremap <silent> <leader><           :split  $TMP/exchange<cr>

