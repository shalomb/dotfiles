" Buffer setup for a /grill-me round file. Loaded with: vim -S grill.vim <round file>
" Buffer-local only: the user's own vimrc and plugins still apply.
setlocal filetype=markdown nofoldenable
syntax match GrillReply /^\s*>>.*/
syntax match GrillPick /^\s*\[[^ ?]\]\s\+[A-Z]\..*/
syntax match GrillUnsure /^\s*\[?\].*/
highlight default link GrillReply DiffAdd
highlight default link GrillPick Title
highlight default link GrillUnsure WarningMsg

let s:box = '^\s*\[.\]\s\+[A-Z]\.'

" Radio button: tick the option on this line, untick the others in its question.
function! s:Tick() abort
  if getline('.') !~ s:box | return | endif
  let top = search('^## ', 'bcnW')
  let bot = search('^## ', 'nW')
  let bot = bot == 0 ? line('$') : bot - 1
  for n in range(top, bot)
    if getline(n) =~ s:box && n != line('.')
      call setline(n, substitute(getline(n), '\[.\]', '[ ]', ''))
    endif
  endfor
  call setline('.', substitute(getline('.'), '\[.\]', '[x]', ''))
endfunction

" Open a clean reply line under the cursor (no autoindent carried over).
function! s:Reply() abort
  call append(line('.'), '>> ')
  call cursor(line('.') + 1, 1)
  startinsert!
endfunction

nnoremap <buffer><silent> ]q :call search('^## ', 'W')<CR>zt
nnoremap <buffer><silent> [q :call search('^## ', 'bW')<CR>zt
nnoremap <buffer><silent> <Space> :call <SID>Tick()<CR>
nnoremap <buffer><silent> >> :call <SID>Reply()<CR>

call cursor(1, 1)
if search('^## ', 'W') | normal! zt
endif
