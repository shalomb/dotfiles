" https://stackoverflow.com/a/6271254/742600
function! s:get_marked_text(m1, m2)
  " Why is this not a built-in Vim script function?!
  let [line_start, column_start] = getpos(a:m1)[1:2]
  let [line_end, column_end] = getpos(a:m2)[1:2]
  let lines = getline(line_start, line_end)
  if len(lines) == 0
      return ''
  endif
  let lines[-1] = lines[-1][: column_end - (&selection == 'inclusive' ? 1 : 2)]
  let lines[0] = lines[0][column_start - 1:]
  return join(lines, "\n")
endfunction

function! s:get_visual_selection()
  " Selected text is between '< and '>
  return s:get_marked_text("'<", "'>")
endfunction

function! s:get_marked_selection()
  " As per :help g@ - our "selected" text is between '[ and ']
  return s:get_marked_text("'[", "']")
endfunction

function! s:q(type, ...)
  if (a:type =~# "^[vV\<C-v>]")
    let search = s:get_visual_selection()
  else
    let search = s:get_marked_selection()
  endif

  let search = trim(search)
  let search = substitute(search, '\v[ \t\n]+', '+', 'g')

  return search
endfunction

function! BrowseUrl(url)
  if len(systemlist('which xdg-open')[0])
    let cmd = 'xdg-open'
  elseif len(systemlist('which open')[0])
    let cmd = 'open'
  endif
  silent call system(cmd . ' ' . a:url)
endfunction

function! CodeSearchDelegate(...)
  return call(&operatorfunc, [visualmode()])
endfunction

function! CodeSearchCheatSh(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://cheat.sh/' . t . '/' . q)
endfunction

function! CodeSearchDebian(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://codesearch.debian.net/search?q=' . q)
endfunction

function! CodeSearchExplainShell(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://explainshell.com/explain?cmd=' . q)
endfunction

function! CodeSearchGoogle(type, ...)
  let q = s:q(a:type)
  return BrowseUrl('https://www.google.com/search?q=' . q)
endfunction

function! CodeSearchGithub(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://github.com/search?type=Code&q=' . q . '+language:' . t)
endfunction

function! CodeSearchGithubGists(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://gist.github.com/search?&q=' . q . '&l=' . t)
endfunction

function! CodeSearchGoDocs(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://godoc.org/?q=' . q)
endfunction

function! CodeSearchGoSearch(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://go-search.org/search?q=' . q)
endfunction

function! CodeSearchPyPi(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://pypi.org/search/?q=' . q)
endfunction

function! CodeSearchPython2Docs(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://docs.python.org//search.html?q=' . q)
endfunction

function! CodeSearchPython3Docs(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://docs.python.org/3/search.html?q=' . q)
endfunction

function! CodeSearchSearchCode(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://searchcode.com/?q=' . q)
endfunction

function! CodeSearchShowTheDocs(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('http://showthedocs.com/query?lang=' . t . '&q=' . q)
endfunction

function! CodeSearchStackOverflow(type, ...)
  let t = &filetype
  let q = s:q(a:type)
  return BrowseUrl('https://stackoverflow.com/search?q=' . q)
endfunction

set opfunc=CodeSearchCheatSh

vnoremap <silent> gs :<C-u>call CodeSearchDelegate()<Cr>
nnoremap <silent> gs g@

" TODO Have a function allow the user to search from the :ex cli
" command! -nargs=*
"   \ CodeSearchDelegate call CodeSearchDelegate(<q-args>)

