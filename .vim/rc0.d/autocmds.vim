""" Autocmds """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
autocmd BufNewFile,Bufread    *.csv     setfiletype csv
autocmd BufNewFile,Bufread    *.ps1     setfiletype ps1
autocmd BufNewFile,Bufread    *.psm1    setfiletype ps1
autocmd FileType perl                   setlocal keywordprg=perldoc\ -T\ -f
                                      " Open_a_Perl_module_from_its_module_name
autocmd FileType sh                     set fileformat=unix fileencoding=ascii nobomb
" autocmd BufWritePost          .vimrc    source ~/.vimrc

augroup markdown
  au!
  au BufNewFile,BufRead *.md,*.markdown setlocal filetype=ghmarkdown
augroup END

augroup xml
  au!
  let g:xml_syntax_folding=1
  au FileType xml setlocal foldmethod=syntax
  autocmd BufRead,BufNewFile *.xml.erb setlocal filetype=xml
  syntax on
augroup END

