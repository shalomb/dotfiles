" go-vim tweaks

" gI            - Show :GoInfo for the identifier under cursor
" ]] | [[       - Jump between function declarations
" c-] | c-t     - Jump to definition

" :GoDecls(Dir) - List go declarations
" :GoFiles      - List of files in the package

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
" let g:go_list_type = "quickfix"

let g:go_test_timeout = '10s'

au BufNewFile,BufRead *.go set completeopt-=preview

let g:go_highlight_build_constraints = 1
let g:go_highlight_types = 1
let g:go_highlight_fields = 1
let g:go_highlight_function_calls = 1
let g:go_highlight_operators = 1
let g:go_highlight_extra_types = 1
let g:go_highlight_generate_tags = 1
let g:go_auto_type_info = 1
let g:go_auto_sameids = 0

autocmd BufNewFile,BufRead *.go setlocal noexpandtab tabstop=4 shiftwidth=4

augroup ft_go
  autocmd!
  autocmd FileType go map gD :GoDeclsDir<cr>
  autocmd Filetype go command! -bang AV call go#alternate#Switch(<bang>0, 'vsplit')
  autocmd FileType go nmap <Leader>i <Plug>(go-info)
  autocmd FileType go nnoremap gT :Tweaks <c-r>=fnamemodify(resolve(expand('<sfile>:p')), ':t:r')<cr><cr>
augroup end
