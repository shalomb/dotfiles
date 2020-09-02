" Settings for gitgutter

set signcolumn=yes

nmap ]h <Plug>(GitGutterNextHunk)
nmap [h <Plug>(GitGutterPrevHunk)

let g:gitgutter_override_sign_column_highlight = 0
let g:gitgutter_sign_allow_clobber = 0

highlight SignColumn ctermbg=NONE ctermfg=35

highlight GitGutterAdd    cterm=bold ctermbg=NONE ctermfg=35
highlight GitGutterChange cterm=bold ctermbg=NONE ctermfg=166
highlight GitGutterDelete cterm=bold ctermbg=NONE ctermfg=196
