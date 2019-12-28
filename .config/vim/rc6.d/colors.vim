"""" Aesthetics """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
set t_Co=256

highlight clear

set background=light
colorscheme molokai
set background=dark

" transparency
highlight Normal  ctermbg=NONE guibg=NONE
highlight NonText ctermbg=NONE guibg=NONE

" xterm colors: http://vim.wikia.com/wiki/Xterm256_color_names_for_console_Vim
highlight ErrorMsg     cterm=bold ctermbg=160 ctermfg=232
highlight FoldColumn   ctermbg=NONE
highlight LineNr       cterm=bold ctermfg=242 ctermbg=234
highlight MatchParen   cterm=none ctermbg=green ctermfg=black

highlight SignColumn   ctermbg=NONE
highlight Visual       cterm=reverse ctermbg=172 ctermfg=238
highlight Search       cterm=reverse ctermbg=202 ctermfg=236
highlight CursorColumn ctermbg=234
highlight ColorColumn  ctermbg=235
highlight CursorLine   ctermbg=234

highlight ShowMarksHLl   cterm=bold ctermfg=166 ctermbg=none
highlight ShowMarksHLu   cterm=bold ctermfg=166 ctermbg=none
highlight ShowMarksHLo   cterm=bold ctermfg=166 ctermbg=none
highlight ShowMarksHLm   cterm=bold ctermfg=166 ctermbg=none
highlight SignColumn     cterm=bold ctermfg=202 ctermbg=233
highlight Comment        cterm=none ctermfg=248

highlight SpellBad       cterm=bold ctermfg=248 ctermbg=52

" diff colours
"gray100 on darkgreen
highlight DiffAdd      ctermfg=232  ctermbg=28   cterm=NONE
highlight DiffChange   ctermfg=172  ctermbg=237  cterm=NONE
highlight DiffDelete   ctermfg=196  ctermbg=160  cterm=NONE
highlight DiffText     ctermfg=16   ctermbg=214  cterm=NONE
