if (!exists('b:yaml_loaded'))
  filetype plugin indent on

  augroup yaml
    au!
    au FileType yaml setl indentkeys-=<:>  " prevent : from adjusting indent
    au FileType yaml setl indentkeys-=-    " same with -
    au FileType yaml setlocal ts=2 sts=2 sw=2 expandtab
  augroup end

  let b:yaml_loaded = 1
endif


