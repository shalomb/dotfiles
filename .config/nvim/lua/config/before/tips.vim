"""" tips """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" Manage files in the ~/tips/ directory

augroup tips_files
  autocmd!
  autocmd BufRead,BufNewFile **/tips/**,*/.tips/** setlocal filetype=markdown sw=2 ts=2 sts=2 et
  autocmd BufRead,BufNewFile **/tips/**,*/.tips/** norm zR
  autocmd BufWritePre        **/tips/*,**/.tips/** :silent !mkdir -p %:p:h
augroup END

function! s:new_tip(arg, ...)
  if len(a:arg)
    let fname = a:arg
  else
    let fname = &filetype . '/'
  endif
  silent execute 'vsplit ~/tips/' . fname . ' | norm 2j'
endfunction

command! -bang -nargs=? Tipnew :call s:new_tip(<q-args>)

command! -bang -nargs=* -complete=dir Tip :call fzf#run(fzf#wrap({
    \ 'source': 'ack --no-color -g .',
    \ 'sink': 'vsplit',
    \ 'dir': '~/tips/',
    \ 'options':
    \   '--border ' .
    \   '--cycle ' .
    \   '--extended ' .
    \   '--height=' .<bang>0. '00 ' .
    \   '--inline-info ' .
    \   '--preview="bat {} --color=always" ' .
    \   '--preview-window="right:50%" ' .
    \   '--query="' . <q-args> . '" ' .
    \   '--select-1 ' .
    \   '--tac '
    \ }, <bang>0))

cabbrev tip    <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Tip' :    'tip')<CR>
cabbrev tips   <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Tip' :    'tips')<CR>
cabbrev tipnew <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Tipnew' : 'tipnew')<CR>
