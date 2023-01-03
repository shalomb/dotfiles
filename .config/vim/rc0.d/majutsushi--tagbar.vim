" https://github.com/majutsushi/tagbar/wiki#google-go
let g:tagbar_type_go = {
  \ 'ctagsbin': 'gotags',
  \ 'ctagsargs': '-sort -silent',
  \ 'ctagstype': 'go',
  \ 'kinds' : [
  \   'f:functions',
  \   'm:methods',
  \   't:type',
  \   'r:constructor:1',
  \   'n:interfaces',
  \   'c:const',
  \   'v:variables',
  \   'w:fields:1',
  \   'e:embedded',
  \   'p:package:1',
  \   'i:imports:1'
  \ ],
  \ 'kind2scope' : {
  \   't': 'ctype',
  \   'n': 'ntype'
  \ },
  \ 'scope2kind' : {
  \   'ctype' : 't',
  \   'ntype' : 'n'
  \ },
  \ 'sro': '.'
\}

" https://github.com/majutsushi/tagbar/wiki#makefile-targets
let g:tagbar_type_make = {
  \ 'kinds':[
  \   'm:macros',
  \   't:targets'
  \ ]
\}

" https://github.com/majutsushi/tagbar/wiki#markdown
let g:tagbar_type_markdown = {
  \ 'ctagstype' : 'markdown',
  \ 'kinds' : [
  \   'h:Heading_L1',
  \   'i:Heading_L2',
  \   'k:Heading_L3'
  \ ]
\ }

" https://github.com/majutsushi/tagbar/wiki#ultisnips
let g:tagbar_type_snippets = {
  \ 'ctagstype' : 'snippets',
  \ 'kinds' : [
  \   's:snippets',
  \ ]
\ }

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
