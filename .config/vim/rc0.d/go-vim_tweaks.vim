" go-vim tweaks

" Also run `goimports` on your current file on every save
" Might be be slow on large codebases, if so, just comment it out
" let g:go_fmt_command = "goimports"
let g:go_fmt_command = "gopls"

" Status line types/signatures.
let g:go_auto_type_info = 1

" If you want to disable gofmt on save
let g:go_fmt_autosave = 0

" Run omnicompletion as soon as . pressed in insert mode
au filetype go inoremap <buffer> . .<C-x><C-o>

" let g:go_list_type = "locationlist"
let g:go_list_type = "quickfix"

let g:go_test_timeout = '10s'
