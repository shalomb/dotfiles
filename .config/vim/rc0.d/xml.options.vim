" xml options

augroup xml
  au!
  let g:xml_syntax_folding=1
  au FileType xml setlocal foldmethod=syntax
  autocmd BufRead,BufNewFile *.xml.erb setlocal filetype=xml
  syntax on
augroup END
