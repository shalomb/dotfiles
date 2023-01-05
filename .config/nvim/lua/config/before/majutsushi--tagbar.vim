" majutsushi/tagbar

" tagbar
augroup majutsushi_tagbar_tweaks
  autocmd!
  autocmd BufEnter tagbar  setlocal nornu
augroup end

let g:tagbar_left = 1
let g:tagbar_height = 30
let g:tagbar_width = max([25, winwidth(0) / 5])
let g:tagbar_zoomwidth = 0
let g:tagbar_autoclose = 1
let g:tagbar_show_linenumbers = 0

let g:tagbar_type_tf = {
  \ 'ctagstype': 'tf',
  \ 'kinds': [
    \ 'r:Resource',
    \ 'R:Resource',
    \ 'd:Data',
    \ 'D:Data',
    \ 'v:Variable',
    \ 'V:Variable',
    \ 'p:Provider',
    \ 'P:Provider',
    \ 'm:Module',
    \ 'M:Module',
    \ 'o:Output',
    \ 'O:Output',
    \ 'f:TFVar',
    \ 'F:TFVar'
  \ ]
\ }
