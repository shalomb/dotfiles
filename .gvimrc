set guioptions-=T   " Remove toolbar
set guioptions-=m   " remove menubar
set guioptions+=i   " use the Vim icon
set guioptions+=a   " own global selection in visual mode
set guioptions+=g   " grey-out not hide menu items
set guioptions+=t   " allow tearoffs in menus
set guioptions+=c   " use console dialogs for questions

set guifont=Bitstream\ Vera\ Sans\ Mono\ 11

colorscheme koehler
set background=dark           " koehler now looks better 

set nocursorline              " highlight the current line
set nocursorcolumn            " highlight the current column
set colorcolumn=+1            " place a soft margin +1 relative to textwidth

highlight Folded        guibg=#1f1f1f guifg=blue
highlight FoldColumn    guibg=#1f1f1f guifg=white

highlight CursorLine    guibg=#0c0c0c
highlight CursorColumn  guibg=#0c0c0c
highlight ColorColumn   guibg=#1c1c1c

highlight Pmenu         guibg=#2f2f2f
highlight PmenuSel      guibg=#3f3f3f gui=bold

highlight statusline    guibg=#cfcfcf guifg=#4f4f2f
highlight Search        guibg=#cc6633 guifg=#040404 gui=bold
highlight Visual        guibg=#303030 gui=bold

" autocmd BufWritePost .gvimrc source ~/.gvimrc

" keybindings
nnoremap <silent> <leader>nm          :if &guioptions =~ 'm'<bar>  set guioptions-=m <bar>else<bar>  set guioptions+=m<bar>endif<cr>

" Stuff to do as late as is possible.
"""" GVim tweaks """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" GUI specific tweaks, incase .gvimrc isn't loaded.
"colorscheme koehler

highlight clear
highlight Normal ctermbg=black ctermfg=grey
highlight Search ctermbg=DarkRed ctermfg=Gray

set background=dark       " vim has a dark background when in the console
colorscheme koehler
