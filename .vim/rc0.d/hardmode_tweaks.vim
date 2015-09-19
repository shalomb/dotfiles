"""" Hardmode.vim """""""""""""""""""""""""""""""""""""""""""""""""""""""""""
let g:HardMode_level = 'wannabe'
autocmd VimEnter,BufNewFile,BufReadPost * silent! call HardMode()
nnoremap <leader>hmm <Esc>:call ToggleHardMode()<CR>
nnoremap <leader>hmh <Esc>:call HardMode()<CR>
nnoremap <leader>hme <Esc>:call EasyMode()<CR>

