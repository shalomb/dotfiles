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
let g:ale_set_quickfix = 1

let g:ale_open_list = 1
" Set this if you want to.
" This can be useful if you are combining ALE with
" some other plugin which sets quickfix errors, etc.
let g:ale_keep_list_window_open = 0

let b:ale_warn_about_trailing_whitespace = 1

let g:ale_fix_on_save = 1

let g:ale_go_golangci_lint_package=1

let g:ale_go_golangci_lint_options = ' --fast '

let g:ale_linters = {
\ 'go': [ 'golangci-lint', 'govet' ],
\ 'python': ['pyls', 'autopep8', 'flake8']
\}

let g:ale_fixers = {
\   '*': ['remove_trailing_lines', 'trim_whitespace'],
\   'go': ['gofmt', 'goimports'],
\   'javascript': ['eslint'],
\}

nmap <silent> <Leader>ck <Plug>(ale_previous_wrap)
nmap <silent> <Leader>cj <Plug>(ale_next_wrap)

nnoremap ]a :ALENextWrap<CR>
nnoremap [a :ALEPreviousWrap<CR>
nnoremap ]A :ALELast
nnoremap [A :ALEFirst

function! ALELinterStatus() abort
	let l:counts = ale#statusline#Count(bufnr(''))
	let l:all_errors = l:counts.error + l:counts.style_error
	let l:all_non_errors = l:counts.total - l:all_errors
	return l:counts.total == 0 ? 'OK' : printf(
				\   '%d⨉ %d⚠ ',
				\   all_non_errors,
				\   all_errors
				\)
endfunction
