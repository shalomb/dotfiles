" https://github.com/majutsushi/tagbar/wiki#google-go
let g:tagbar_type_go = {
  \ 'ctagstype': 'go',
  \ 'kinds' : [
  \   'c:const',
  \   'f:functions',
  \   'i:imports:1',
  \   'n:interfaces',
  \   'w:fields',
  \   'e:embedded',
  \   'm:methods',
  \   'r:constructor',
  \   'p:package',
  \   't:type',
  \   'v:variables'
  \ ],
  \ 'sro': '.',
  \ 'kind2scope' : {
  \   't': 'ctype',
  \   'n': 'ntype'
  \ },
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
