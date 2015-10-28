function! ToggleHeading(level)
  let level = a:level
  if getline('.') =~ "^#"
    s/^\v\s*#+\s*//
  endif
  call setline('.', (repeat('#',a:level) . ' ' . getline('.'))) 
  normal! $
endfunction

function! PrependBlockWithChars(chars)
  call setline('.', a:chars . getline('.'))
endfunction

function! ConvertToBlockQuote()
  call PrependBlockWithChars('> ')
endfunction

function! ConvertToUL()
  if getline('.') !~ "^\ *\\*"
    call PrependBlockWithChars('* ')
  endif
endfunction

function! SetProgressIndicatorValue(linenr, value)
  exe a:linenr . "perldo s/\\s*⎡[^][]+⎦$//"
  exe a:linenr . "perldo s{$}{ ⎡" . a:value . "⎦}"
endfunction

function! IsListItem(linenr)
  let line = getline(a:linenr)
  " if line =~ "^\\s*\\*\\s*\\[[^][]\\]"
  if line =~ "^\\s*\\*\\s*"
    return 1
  endif
  return 0
endfunction

function! GetTodoItemLevel(linenr)
  let line = getline(a:linenr)
  if line =~ "^\\s*\\*"
    return strlen(substitute(line, '\S.*$', '', ''))
  endif
endfunction

function! GetTodoItemStatus(linenr)
  let line = getline(a:linenr)
  "return ( !(line =~ "^\s*\\*\s*\\[[\s\?]\\]\s*") )
  " "^\\s*\\*\\s*\\[[\ \?]\*\\]"
  if line =~ "^\\s*\\*\\s*\\[[^\ \?]\*\\]"
    let a = substitute(line, "^\\s*\\*\\s*\\[\\|\\].*", '', 'g')
    return a
  endif
  return 0
endfunction

function! EvalPerl(expr)
  let result = system("perl -e 'print+(" . a:expr . ")'")
  return result
endfunction

function! UpdateProgressIndicator()
  let current_level = GetTodoItemLevel('.')
  let current_line = line('.')

  let begin_line = current_line
  while begin_line > line('^')
    if IsListItem(begin_line) && GetTodoItemLevel(begin_line) < current_level
      break
    endif
    let begin_line -= 1
  endwhile

  let end_line = current_line
  while end_line < line('$')
    if IsListItem(end_line) && GetTodoItemLevel(end_line) < current_level
      break
    endif
    let end_line += 1
  endwhile
  let end_line -= 1

  let complete=0
  let total=0
  for i in range((begin_line+1), end_line)
    if IsListItem(i)
      let status = GetTodoItemStatus(i)
      if status =~ "[xX+*✖✕✔✓]"
        let complete = EvalPerl( 'sprintf "%0.2", ' . complete . '+ 1' )
      elseif status =~ "\\d/\\d"
        let complete = EvalPerl( 'sprintf "%0.2f", ' .
                                    \ complete . '+ (' . status . ')' )
      elseif status =~ "\\d"
        let complete = EvalPerl( 'sprintf "%0.2f", ' .
                                    \ complete . '+ (' . status . '/100)' )
      endif
      let total+=1
    endif
  endfor

  let expr = 'sprintf "%.2f", 100 * (' . complete . '/(' . total . '))'
  let progress = EvalPerl(expr)
  echom begin_line . ' -> ' . end_line .
        \ ' ' . complete . '/' . (total) . ' ' . progress . ' ' . expr
  call SetProgressIndicatorValue(begin_line, 
        \ complete . '/' . (total) . '=' . progress . '%')
endfunction

function! MarkTodoItem(mark)
  exe '.perldo s/\[.*?\]/[' . a:mark . ']/'
endfunction

function! CompleteTodoItem()
  call MarkTodoItem('x')
endfunction

function! ConvertToTodoList()
  .perldo s/^(\s*[*\-+])\s*/$1 \[ ] /
endfunction

function! SelectListSection()
  normal! vipo

  let s:startpos = getpos("'<")
  let s:endpos = getpos("'>")

  for i in range(s:startpos[1], s:endpos[1])
    if getline(i) =~ "^#"
      let s:startpos[1] = i + 1
      break
    endif
  endfor

  echom join(s:startpos) . ' -> ' . join(s:endpos)

  call setpos("'<", s:startpos)
  call setpos("'>", s:endpos)
  normal! gv
endfunction

function! InsertHyperLink()
  normal! a[]()2h
  startinsert
endfunction

function! ConvertToHyperLink()
  let current_word = expand("<cword>")
  if empty(current_word) || current_word =~ "\s"
    normal! xa()
    normal! %
  else
    normal ysiW)
  endif
  normal! i[]
  startinsert
endfunction

function! Strip(str, re)
  return substitute(a:str, a:re, '', '')
endfunction

function! GetDate(...)
  let request_fmt = a:0 >= 1 ? a:1 : '%FT%T%z'
  let start_date  = a:0 >= 2 ? a:2 : ''
  let display_fmt = a:0 >= 3 ? a:3 : '%FT%T%z'
  if request_fmt =~ "^+"
    let str = system('date +"'. display_fmt
          \ .'" -d "'. start_date .' '. request_fmt .'" 2>/dev/null')
  else
    let str = strftime(request_fmt)
  endif
  return substitute(str, '\n$', '', '')
endfunction

function! AddTime(datefmt)
  let current_date = expand("<cWORD>")
  let str = GetDate(a:datefmt, current_date)
  if !empty(str)
    normal! ciW
    exec "normal! a" . str
  endif
endfunction

function! InsertDate(datefmt)
  let str = GetDate(a:datefmt)
  if !empty(str)
    exe "normal! a" . str
  endif
endfunction

function! ConvertToFencedBlock()
  "normal! 
  let mode = mode()
  if mode =~ "v"
    let s:startpos = getpos("'<")
    let s:endpos   = getpos("'>")
  else
    let s:startpos = getpos(".")
    let s:endpos   = s:startpos
  endif
  keepjumps call setpos(".", s:endpos)
  keepjumps normal! o```
  keepjumps call setpos(".", s:startpos)
  keepjumps normal! O```
  syntax sync fromstart
endfunction

function! SelectBlock()
  let s:startpos  = getpos('.')
  let block_begin_linenr = line('.')
  let block_end_linenr = line('.')

  let begin_re = "^\s*#"
  while block_begin_linenr > line('^') &&
        \ getline(block_begin_linenr) !~ begin_re
    let block_begin_linenr -= 1
  endwhile

  let header_line = getline(block_begin_linenr)
  let header_level = strlen(substitute(header_line, '[^#].*', '', ''))

  let end_re = "^\s*#\\{1," . (header_level) . "\\}[^#]"
  while block_end_linenr < line('$') &&
        \ getline(block_end_linenr+1) !~ end_re
    let block_end_linenr += 1
  endwhile

  if block_begin_linenr <= 0
    let block_begin_linenr=1
    if block_end_linenr >= 0
      let block_end_linenr -= 1
    endif
  endif

  echom "h/f : " . block_begin_linenr . " " . block_end_linenr
  call setpos("'<", [s:startpos[0], block_begin_linenr, 0])
  call setpos("'>", [s:startpos[0], block_end_linenr,   0])
  normal! gvo
endfunction

function! InsertTodoDate()
  normal $a<C-R>=strftime("%Ft%T")<cr>
endfunction

function! MarkDownFoldText()
  let l1 = getline(v:foldstart)
  if l:l1[0] != '#'
    return l:l1 . repeat(' ', 78-strlen(l:l1))
  else
    return l:l1 . '  ' . repeat(' ', 78-strlen(l:l1))
  endif
endfunction

func! MarkDownFoldExpr(lnum)
    let theline = getline(v:lnum)
    let nextline = getline(v:lnum+1)
    if theline =~ '^# ' 
        " begin a fold of level one here
            return ">1"
    elseif theline =~ '^## ' 
        " begin a fold of level two here
            return ">2"
    elseif theline =~ '^### ' 
        " begin a fold of level three here
            return ">3"
    elseif nextline =~ '^===*'
        " elseif the next line starts with at least two ==
        return ">1"
    elseif nextline =~ '^---*'
        " elseif the line ends with at least two --
        return ">2"
    elseif foldlevel(v:lnum-1) != "-1" 
        return foldlevel(v:lnum-1)
    else
        return "="
    endif
endfunc

nmap <leader>h1 :call ToggleHeading(1)<cr>
nmap <leader>h2 :call ToggleHeading(2)<cr>
nmap <leader>h3 :call ToggleHeading(3)<cr>
nmap <leader>h4 :call ToggleHeading(4)<cr>
nmap <leader>h5 :call ToggleHeading(5)<cr>
nmap <leader>h6 :call ToggleHeading(6)<cr>

vmap <leader>ul :call ConvertToUL()<cr>
nmap <leader>sl :call SelectListSection()<cr>
nmap <leader>mB :call SelectBlock()<cr>
nmap <leader>hl :call ConvertToHyperLink()<cr>

vmap <leader>fb :<c-u>call ConvertToFencedBlock()<cr>

function! SurroundWithChar(char)
  let char = a:char
  let mode = mode()
  if mode =~ "v"
    normal! gv"xy
    let @x = char . @x .char
    normal! gvd"xP
  else
    let word = char . expand("<cWORD>") . char
    normal! ciW
    exe "normal! a" . word
  endif
endfunction

map <leader>mc :<c-u>call SurroundWithChar('`')<cr>
map <leader>me :<c-u>call SurroundWithChar('_')<cr>
map <leader>ms :<c-u>call SurroundWithChar('__')<cr>
" map <leader>mt :<c-u>call SurroundWithChar('~~')<cr>
map <leader>mb :call ConvertToBlockQuote()<cr>
map <leader>ml :call InsertHyperLink()<cr>

augroup markdown
  autocmd!
  autocmd BufRead,BufNewFile *.md,*.mkd,*.markdown
          \ setfiletype markdown
  autocmd filetype markdown
           \ setlocal foldtext=MarkDownFoldText()
           \          foldexpr=MarkDownFoldExpr(v:lnum)
           \          foldlevel=1
           \          foldcolumn=0
           \          foldmethod=expr
           \          foldenable
           \          formatprg=par\ -jw80
  " autocmd BufWritePost <buffer>
  "     \ silent :!pandoc -c ~/.config/dotfiles/pandoc/pandoc.css
  "     \ --toc --from markdown_github % > %:r.html
augroup END

syn match myDate /\v\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
syn match myDate /\\*\s*\[\zs[^][]\+/
hi        myDate ctermfg=Red

syn match CompletedTodoItem /\\*\s*\[\zs[x]\+/
hi        CompletedTodoItem ctermfg=green cterm=bold

" echom "markdown_tweaks.vim complete"


