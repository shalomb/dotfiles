" crosshairs.vim 
"   Shows cursor{line,column} for a brief period to locate the
"   cursor
" Requires tpope/vim-unimpaired

function! ShowCrossHairs(...)
  let l:cursorline = &cursorline
  let l:period = a:0 == 1 ? a:1 : '50m'
  call execute('norm [ox')
  redraw
  execute('sleep ' . l:period)
  call execute('norm ]ox')
  redraw
  let &cursorline = l:cursorline
endfunction

au BufEnter * call ShowCrossHairs('25m')
nnoremap qq  :call ShowCrossHairs('100m')<CR>

