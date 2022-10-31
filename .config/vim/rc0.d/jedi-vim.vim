" https://github.com/davidhalter/jedi-vim

" Completion <C-Space>
" Goto assignment <leader>g (typical goto function)
" Goto definition <leader>d (follow identifier as far as possible, includes imports and statements)
" Goto (typing) stub <leader>s
" Show Documentation/Pydoc K (shows a popup with assignments)
" Renaming <leader>r
" Usages <leader>n (shows all the usages of a name)
" Open module, e.g. :Pyimport os (opens the os module)

let g:jedi#auto_vim_configuration = 1
let g:jedi#popup_on_dot = 1
let g:jedi#popup_select_first = 1
let g:jedi#show_call_signatures = "1"
let g:jedi#use_splits_not_buffers = "left"
let g:jedi#auto_initialization = 1

set completeopt=longest,menuone,preview
set splitright
