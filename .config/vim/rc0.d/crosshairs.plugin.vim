" crosshairs.vim
"   Shows cursor{line,column} for a brief period to locate the
"   cursor
" Requires tpope/vim-unimpaired

function! GetHlValue(...)
  let l:hl_val = execute(':highlight ' . a:1)
  let l:hl_val = substitute(l:hl_val, '\n\|xxx', '', 'g')
  return l:hl_val
endfunction

function! SetHlValue(...)
  execute(':highlight ' . a:1)
endfunction

function! ShowCrossHairs(...)
  let l:cursorline = &cursorline
  let l:period = a:0 == 1 ? a:1 : '50m'
  let l:hl_cl = GetHlValue('CursorLine')
  let l:hl_cc = GetHlValue('CursorColumn')
  let l:colour = 74
  execute('highlight CursorLine   ctermbg=' . l:colour)
  execute('highlight CursorColumn ctermbg=' . l:colour)
  call execute('norm [ox')
  redraw
  execute('sleep ' . l:period)
  call execute('norm ]ox')
  redraw
  let &cursorline = l:cursorline
  call SetHlValue(l:hl_cl)
  call SetHlValue(l:hl_cc)
endfunction

nnoremap qq  :call ShowCrossHairs('50m')<CR>
