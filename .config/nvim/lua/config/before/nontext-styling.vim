scriptencoding utf-8

set fillchars=vert:█
set fillchars=vert:╳
augroup vertsplit_colors
  autocmd!
  " Listen for VimEnter event in case no colorscheme is set.
  autocmd ColorScheme,VimEnter *
      \ highlight clear VertSplit |
      \ highlight VertSplit term=reverse cterm=reverse gui=reverse
augroup END

"autocmd ColorScheme * highlight VertSplit cterm=None ctermfg=Green ctermbg=green
"highlight VertSplit cterm=NONE ctermfg=24 ctermbg=None
"highlight NonText     cterm=None ctermfg=238 ctermbg=None
"highlight EndOfBuffer cterm=None ctermfg=238 ctermbg=None
