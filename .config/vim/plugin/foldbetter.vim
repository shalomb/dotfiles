" " Set a nicer foldtext function
" set foldtext=MyFoldText()
" function! MyFoldText()
"   let line = getline(v:foldstart)
"   if match( line, '^[ \t]*\(\/\*\|\/\/\)[*/\\]*[ \t]*$' ) == 0
"     let initial = substitute( line, '^\([ \t]\)*\(\/\*\|\/\/\)\(.*\)', '\1\2', '' )
"     let linenum = v:foldstart + 1
"     while linenum < v:foldend
"       let line = getline( linenum )
"       let comment_content = substitute( line, '^\([ \t\/\*]*\)\(.*\)$', '\2', 'g' )
"       if comment_content != ''
"         break
"       endif
"       let linenum = linenum + 1
"     endwhile
"     let sub = initial . ' ' . comment_content
"   else
"     let sub = line
"     let startbrace = substitute( line, '^.*{[ \t]*$', '{', 'g')
"     if startbrace == '{'
"       let line = getline(v:foldend)
"       let endbrace = substitute( line, '^[ \t]*}\(.*\)$', '}', 'g')
"       if endbrace == '}'
"         let sub = sub.substitute( line, '^[ \t]*}\(.*\)$', '...}\1', 'g')
"       endif
"     endif
"   endif
"   let n = v:foldend - v:foldstart + 1
"   let info = " " . n . " lines"
"   let sub = sub . "                                                                                                                  "
"   let num_w = getwinvar( 0, '&number' ) * getwinvar( 0, '&numberwidth' )
"   let fold_w = getwinvar( 0, '&foldcolumn' )
"   let sub = strpart( sub, 0, winwidth(0) - strlen( info ) - num_w - fold_w - 1 )
"   return sub . info
" endfunction
" 
if has("folding")
  set foldtext=MyFoldText()
  function! MyFoldText()
    " for now, just don't try if version isn't 7 or higher
    if v:version < 701
      return foldtext()
    endif
    " clear fold from fillchars to set it up the way we want later
    let &l:fillchars = substitute(&l:fillchars,',\?fold:.','','gi')
    let l:numwidth = (v:version < 701 ? 8 : &numberwidth)
    if &fdm=='diff'
      let l:linetext=''
      let l:foldtext='---------- '.(v:foldend-v:foldstart+1).' lines the same ----------'
      let l:align = winwidth(0)-&foldcolumn-(&nu ? Max(strlen(line('$'))+1, l:numwidth) : 0)
      let l:align = (l:align / 2) + (strlen(l:foldtext)/2)
      " note trailing space on next line
      setlocal fillchars+=fold:\ 
    elseif !exists('b:foldpat') || b:foldpat==0
      let l:foldtext = ' '.(v:foldend-v:foldstart).' lines'.v:folddashes.'|'
      let l:endofline = (&textwidth>0 ? &textwidth : 80)
      let l:linetext = strpart(getline(v:foldstart),0,l:endofline-strlen(l:foldtext))
      let l:align = l:endofline-strlen(l:linetext)
      setlocal fillchars+=fold:-
    elseif b:foldpat==1
      let l:align = winwidth(0)-&foldcolumn-(&nu ? Max(strlen(line('$'))+1, l:numwidth) : 0)
      let l:foldtext = ' '.v:folddashes
      let l:linetext = substitute(getline(v:foldstart),'\s\+$','','')
      let l:linetext .= ' ---'.(v:foldend-v:foldstart-1).' lines--- '
      let l:linetext .= substitute(getline(v:foldend),'^\s\+','','')
      let l:linetext = strpart(l:linetext,0,l:align-strlen(l:foldtext))
      let l:align -= strlen(l:linetext)
      setlocal fillchars+=fold:-
    endif
    return printf('%s%*s', l:linetext, l:align, l:foldtext)
  endfunction
endif
