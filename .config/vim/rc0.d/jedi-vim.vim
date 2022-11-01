" https://github.com/davidhalter/jedi-vim

" <C-Space>    - Completion
" <leader>g    - Goto assignment
"                (typical goto function)
" <leader>d    - Goto definition
"                (follow identifier as far as possible,
"                includes imports and statements)
" <leader>s    - Goto (typing) stub
" K            - Show Documentation/Pydoc
"						  	 (shows a popup with assignments)
" <leader>r    - Rename identifier
" <leader>n    - Usages
"						  	 (shows all the usages of a name)
" :Pyimport os - Open module, e.g. (opens the os module)

let g:jedi#auto_vim_configuration = 1
let g:jedi#popup_on_dot = 1
let g:jedi#popup_select_first = 1
let g:jedi#show_call_signatures = "1"
let g:jedi#use_splits_not_buffers = "left"
let g:jedi#auto_initialization = 1

set completeopt=longest,menuone,preview
set splitright
