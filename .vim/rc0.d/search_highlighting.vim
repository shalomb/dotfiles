" Disable highlighting and do the default of clearning/redrawing the screen
nnoremap <C-l> :nohlsearch<CR><C-l>

" Disable highlighting when in insert mode
autocmd InsertEnter * :setlocal nohlsearch
autocmd InsertLeave * :setlocal hlsearch
