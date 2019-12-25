setglobal formatprg=par\ -jw79
setglobal equalprg=par

" Courtesty https://vi.stackexchange.com/a/12997/12589
function! UpdateFormatprg()
  let &g:formatprg = substitute( &g:formatprg , '\d\+', &textwidth , "" )
endfunction

augroup UpdateFormatprgGroup
  autocmd!
  autocmd VimEnter,BufEnter * call UpdateFormatprg()
  autocmd OptionSet textwidth call UpdateFormatprg()
augroup end
