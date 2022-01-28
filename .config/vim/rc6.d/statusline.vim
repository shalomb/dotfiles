" statusline settings

highlight statusline ctermbg=None ctermfg=8
highlight User1  ctermbg=234 ctermfg=8  cterm=bold
highlight User2  ctermbg=234 ctermfg=9  cterm=bold
highlight User3  ctermbg=234 ctermfg=40 cterm=bold
highlight User4  ctermbg=234 ctermfg=39 cterm=bold
highlight User5  ctermbg=234 ctermfg=14 cterm=bold
highlight User6  ctermbg=234 ctermfg=29 cterm=bold
highlight User7  ctermbg=234 ctermfg=60 cterm=bold
highlight User8  ctermbg=234 ctermfg=75 cterm=bold
highlight User9  ctermbg=234 ctermfg=8  cterm=bold

set statusline=%1*
set statusline+=\ %2*%t     " filename (tail)
set statusline+=%3*\ %n\    " buffer #
set statusline+=            "
set statusline+=%3*\ %{ALELinterStatus()} " Our custom linter status
set statusline+=            "
set statusline+=%4*%{substitute(fugitive#statusline(),\'GIT\\(.*\\)(\\(.*\\))\',\'\\2\\1\',\'g\')}
set statusline+=%9*\%<\ \   " Where to truncate a long line
set statusline+=%a          " argument list status (e.g. 1 of 3)
set statusline+=            "
set statusline+=%M          " modified flag
set statusline+=%R          " readonly flag
set statusline+=            "
set statusline+=%H          " help buffer flag
set statusline+=%5*%Y%9*    " filetype
set statusline+=%W          " preview window flag
set statusline+=\           "
set statusline+=%{&ff}      " file format
set statusline+=\           "
set statusline+=%{strlen(&fenc)?&fenc:&enc}   " file encoding
set statusline+=\ \ \       "
set statusline+=%{&fo}      " format options
set statusline+=            "
set statusline+=%2*\ %{v:register}\  " last register used
set statusline+=%1*         "
set statusline+=%=          " separation point for RHS items
set statusline+=%-14.(%l/%L,%c%V\ (%4*%P%9*)%) "line#/#ofLines,col#vCol#.%inFile
set statusline+=            "
set statusline+=%7*%8o,0x%06O   " byte number in file in decimal,hex
set statusline+=            "
set statusline+=%8*%5b,0x%04B   " value of character in decimal,hex
set statusline+=\           "
set statusline+=%6*%{&sw},%{&ts},%{&et} " shiftwidth, tabstop and expandtab
set statusline+=            "
set statusline+=%8*%{v:foldlevel} " fold level
set statusline+=, "
set statusline+=%{indent('.')/&ts} " indent level
set statusline+=\           "
set statusline+=%2*%N\      " Printer page number
set statusline+=%*

" TODO
" Fix active window statusline
" https://vi.stackexchange.com/a/11600/12589
" autocmd VimEnter,WinEnter,BufWinEnter * call <SID>RefreshStatus()
