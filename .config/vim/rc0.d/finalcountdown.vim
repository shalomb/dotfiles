" https://www.reddit.com/r/vim/comments/b00bcq/how_to_automatically_close_netrw_when_exiting_a/eibd46z/
" close if final buffer is netrw or the quickfix
augroup finalcountdown
  autocmd!
  autocmd WinEnter * if winnr('$') == 1 && (getbufvar(winbufnr(winnr()), "&filetype") == "netrw" || &buftype == 'quickfix') | q | endif
augroup END
