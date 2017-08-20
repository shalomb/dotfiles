" Requires tpope/vim-unimpaired

function! ShowCrossHairs(...)
  let l:foo = a:0 == 1 ? a:1 : '50m'
  call execute('norm [ox')
  redraw
  execute('sleep ' . l:foo)
  call execute('norm ]ox')
  redraw
endfunction

au BufEnter * call ShowCrossHairs('25m')
nnoremap qq  :call ShowCrossHairs('100m')<CR>

"au BufLeave * call execute('norm =ox')


