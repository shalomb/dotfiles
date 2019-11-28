" https://github.com/majutsushi/tagbar/wiki#google-go
let g:tagbar_type_go = {
  \ 'ctagstype': 'go',
  \ 'ctagsargs': '-sort -silent',
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
  \ 'sro': '.',
  \ 'kind2scope' : {
  \   't': 'ctype',
  \   'n': 'ntype'
  \ },
  \ 'ctagsbin': 'gotags',
  \ 'scope2kind' : {
  \   'ctype' : 't',
  \   'ntype' : 'n'
  \ }
\}

" https://github.com/majutsushi/tagbar/wiki#makefile-targets
let g:tagbar_type_make = {
            \ 'kinds':[
                \ 'm:macros',
                \ 't:targets'
            \ ]
\}

" https://github.com/majutsushi/tagbar/wiki#markdown
let g:tagbar_type_markdown = {
    \ 'ctagstype' : 'markdown',
    \ 'kinds' : [
        \ 'h:Heading_L1',
        \ 'i:Heading_L2',
        \ 'k:Heading_L3'
    \ ]
\ }

" https://github.com/majutsushi/tagbar/wiki#ultisnips
let g:tagbar_type_snippets = {
    \ 'ctagstype' : 'snippets',
    \ 'kinds' : [
        \ 's:snippets',
    \ ]
\ }
