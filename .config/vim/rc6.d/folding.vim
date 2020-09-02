" Finds the indent of a line. The indent of a blank line is the indent of the
" first non-blank line above it.
function! FindIndent(line_number, indent_width)
    " Regular expression for a "blank" line
    let regexp_blank = "^\s*$"

    let non_blank_line = a:line_number
    while non_blank_line > 0 && getline(non_blank_line) =~ regexp_blank
        let non_blank_line = non_blank_line - 1
    endwhile
    return indent(non_blank_line) / a:indent_width
endfunction

" 'foldexpr' for Atom-style indent folding
function! AtomStyleFolding(line_number)
    let indent_width = &shiftwidth

    " Find current indent
    let indent = FindIndent(a:line_number, indent_width)

    " Now find the indent of the next line
    let indent_below = FindIndent(a:line_number + 1, indent_width)

    " Calculate indent level
    if indent_below > indent
      return indent_below
    elseif getline(a:line_number) =~ '\v^\s*end(if|func|function)\s*$'
      return "<" . (indent + 1)
    else
      return indent
    endif
endfunction

function! FoldText()
    if has('multi_byte')
        let defaults = {'placeholder': '═══',   'line': ' ', 'multiplication': '⊸ ' }
    else
        let defaults = {'placeholder': '...', 'line': 'L', 'multiplication': '*' }
    endif

    let g:FoldText_placeholder    = get(g:, 'FoldText_placeholder',    defaults['placeholder'])
    let g:FoldText_line           = get(g:, 'FoldText_line',           defaults['line'])
    let g:FoldText_multiplication = get(g:, 'FoldText_multiplication', defaults['multiplication'])
    let g:FoldText_info           = get(g:, 'FoldText_info',           1)
    let g:FoldText_width          = get(g:, 'FoldText_width',          0)

    unlet defaults

    let fs = v:foldstart
    while getline(fs) =~ '^\s*$'
        let fs = nextnonblank(fs + 1)
    endwhile
    if fs > v:foldend
        let line = getline(v:foldstart)
    else
        let spaces = repeat(' ', &tabstop)
        let line = substitute(getline(fs), '\t', spaces, 'g')
    endif

    let endBlockChars   = ['end', '}', ']', ')', '})', '},', '}}}']
    let endBlockRegex = printf('^\(\s*\|\s*\"\s*\)\(%s\);\?$', join(endBlockChars, '\|'))
    let endCommentRegex = '\s*\*/\s*$'
    let startCommentBlankRegex = '\v^\s*/\*!?\s*$'

    let foldEnding = strpart(getline(v:foldend), indent(v:foldend), 3)

    if foldEnding =~ endBlockRegex
        if foldEnding =~ '^\s*\"'
            let foldEnding = strpart(getline(v:foldend), indent(v:foldend)+2, 3)
        end
        let foldEnding = " " . g:FoldText_placeholder . " " . foldEnding
    elseif foldEnding =~ endCommentRegex
        if getline(v:foldstart) =~ startCommentBlankRegex
            let nextLine = substitute(getline(v:foldstart + 1), '\v\s*\*', '', '')
            let line = line . nextLine
        endif
        let foldEnding = " " . g:FoldText_placeholder . " " . foldEnding
    else
        let foldEnding = " " . g:FoldText_placeholder . " " . getline(v:foldend)
    endif
    let foldEnding = substitute(foldEnding, '\s\+$', '', '')

    redir =>signs | exe "silent sign place buffer=".bufnr('') | redir end
    let signlist = split(signs, '\n')
    let foldColumnWidth = (&foldcolumn ? &foldcolumn : 0)
    let numberColumnWidth = &number ? strwidth(line('$')) : 0
    let signColumnWidth = len(signlist) >= 2 ? 2 : 0
    let width = winwidth(0) - foldColumnWidth - numberColumnWidth - signColumnWidth
    let width = (&textwidth ? &textwidth : 78)

    let ending = ""
    if g:FoldText_info
        if g:FoldText_width > 0 && g:FoldText_width < (width-6)
            let endsize = "%-" . string(width - g:FoldText_width + 4) . "s"
        else
            let endsize = "%-11s"
        end
        let foldSize = 1 + v:foldend - v:foldstart
        let ending = printf("%s%s%s", g:FoldText_line, g:FoldText_multiplication, foldSize)
        let ending = printf(endsize, ending)

        if strwidth(line . foldEnding . ending) >= width
            let line = strpart(line, 0, width - strwidth(foldEnding . ending) - 2)
        endif
    endif

    let expansionStr = repeat(" ", width - strwidth(line . foldEnding . ending))
    return '▶' . line[1:] . foldEnding . expansionStr . ending
endfunction

set fillchars-=fold
set fillchars+=fold: 
" set foldexpr=AtomStyleFolding(v:lnum)
set foldlevel=0
set foldmethod=expr
set foldmethod=indent
set foldtext=FoldText()

highlight Folded term=None cterm=None ctermfg=240 ctermbg=None
highlight FoldColumn term=standout ctermfg=66

set foldenable! " disable automatic folding,
                " while nice it's enabled even when switching to open buffers
