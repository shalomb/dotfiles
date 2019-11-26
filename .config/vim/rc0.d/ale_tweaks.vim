let g:ale_sign_column_always = 1

" Error Highlighting
let g:ale_set_highlights = 1
highlight ALEWarning ctermbg=DarkMagenta

" Formatting
let g:ale_echo_msg_error_str = 'E'
let g:ale_echo_msg_warning_str = 'W'
let g:ale_echo_msg_format = '[%linter%, %severity%] %s'

" Write this in your vimrc file
let g:ale_set_loclist = 0
let g:ale_set_quickfix = 0

let g:ale_open_list = 1
" Set this if you want to.
" This can be useful if you are combining ALE with
" some other plugin which sets quickfix errors, etc.
let g:ale_keep_list_window_open = 0

let b:ale_warn_about_trailing_whitespace = 1
