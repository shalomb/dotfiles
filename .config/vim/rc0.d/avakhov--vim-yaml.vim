augroup yaml
  au!
  au FileType yaml setl indentkeys-=-    " Stop vim from indenting on -
  au FileType yaml setl indentkeys-=<:>    " Stop vim from indenting on :
  au FileType yaml setl indentkeys-=0#    " Stop vim from indenting on #
  au FileType yaml setlocal ts=2 sts=2 sw=2 expandtab
augroup end


