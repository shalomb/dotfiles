" cursor shape and colour

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

  " Setup normal mode shape when vim is started
  autocmd VimEnter * silent !echo -ne "\033Ptmux;\033\033[2 q\033\\"

  " Normal Mode Cursor
  let &t_EI = "\033Ptmux;\033\033[2 q\033\\"
  " Insert Mode Cursor
  let &t_SI = "\033Ptmux;\033\033[6 q\033\\"
  " Replace Mode Cursor
  let &t_SR = "\033Ptmux;\033\033[3 q\033\\"

elseif &term =~ "xterm\\|rxvt\\|screen-256color\\|tmux-256color"
  " use a red cursor otherwise
  let &t_EI = "\033]12;red\x7"
  " use an orange cursor in insert mode
  let &t_SI = "\033]12;orange\x7"
  silent !echo -ne "\033]12;orange\007"
  " reset cursor when vim exits
  autocmd VimLeave * silent !echo -ne "\033]112\007"
  " use \003]12;gray\007 for gnome-terminal
endif

highlight CursorLineNr term=bold cterm=bold ctermfg=202 ctermbg=NONE guibg=NONE
highlight CursorLine   term=bold cterm=bold ctermbg=234 guibg=NONE
highlight CursorColumn term=bold cterm=bold ctermbg=234 guibg=NONE
