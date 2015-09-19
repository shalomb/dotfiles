"""" AutoHighlightToggle """"""""""""""""""""""""""""""""""""""""""""""""""""""
" http://vim.wikia.com/wiki/Auto_highlight_current_word_when_idle

function! AutoHighlightToggle()
  let @/ = ''
  if exists('#auto_highlight')
    au! auto_highlight
    augroup! auto_highlight
    setl updatetime=4000
    echo 'AutoHiglight: OFF'
    return 0
  else
    augroup auto_highlight
      au!
      au CursorHold * let @/ = '\V\<'.escape(expand('<cword>'), '\').'\>'
    augroup end
    setl updatetime=500
    echo 'AutoHighlight: ON'
    return 1
  endif
endfunction
