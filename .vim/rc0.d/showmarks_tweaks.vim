"""" ShowMarks.vim """""""""""""""""""""""""""""""""""""""""""""""""""""""""""
let showmarks_include = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
let g:showmarks_enable = 1
let g:showmarks_textlower = "'\t"
let g:showmarks_textupper = "'\t"
let g:showmarks_textother = "'\t"
" For marks a-z
highlight ShowMarksHLl gui=bold ctermfg=Blue   ctermbg=NONE
" For marks A-Z
highlight ShowMarksHLu gui=bold ctermfg=Red    ctermbg=NONE
" For all other marks
highlight ShowMarksHLo gui=bold ctermfg=Green  ctermbg=NONE
" For multiple marks on the same line
highlight ShowMarksHLm gui=bold ctermfg=Yellow ctermbg=NONE

"set cursorline              " highlight the current line
"set cursorcolumn            " highlight the current column
"set colorcolumn=+1            " place a soft margin +1 relative to textwidth
"highlight CursorLine    ctermbg=lightred
"highlight CursorColumn  ctermbg=lightred
"highlight ColorColumn   ctermbg=lightred

