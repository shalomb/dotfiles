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

" cursor
if exists('$TMUX')
  " Changing cursor shape per mode
  " 1 or 0 -> blinking block
  " 2 -> solid block
  " 3 -> blinking underscore
  " 4 -> solid underscore
  " 5 -> blinking vertical bar
  " 6 -> solid vertical bar

  " tmux will only forward escape sequences to the terminal if surrounded by a
  " DCS sequence

  " Insert Mode Cursor
  let &t_SI .= "\<Esc>Ptmux;\<Esc>\<Esc>[6 q\<Esc>\\" 

  " setup the cursor shape when vim is started
  autocmd VimEnter * silent !echo -ne "\033Ptmux;\033\033[4 q\033\\"
  " Normal Mode Cursor
  let &t_EI .= "\<Esc>Ptmux;\<Esc>\<Esc>[4 q\<Esc>\\"

elseif &term =~ "xterm\\|rxvt\\|screen-256color"
  " use a red cursor otherwise
  let &t_EI = "\<Esc>]12;red\x7"
  " use an orange cursor in insert mode
  let &t_SI = "\<Esc>]12;orange\x7"
  silent !echo -ne "\033]12;orange\007"
  " reset cursor when vim exits
  autocmd VimLeave * silent !echo -ne "\033]112\007"
  " use \003]12;gray\007 for gnome-terminal
endif
