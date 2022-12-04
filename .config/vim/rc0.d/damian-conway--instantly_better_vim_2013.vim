"""" IBV2013 """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
call matchadd('ColorColumn','\%81v',100)
highlight ColorColumn ctermbg=magenta

"====[ Make the 81st column stand out ]====================

    " EITHER the entire 81st column, full-screen...
    highlight ColorColumn ctermbg=magenta
    " set colorcolumn=81

    " OR ELSE just the 81st column of wide lines...
    highlight ColorColumn ctermbg=magenta
    call matchadd('ColorColumn', '\%81v', 100)

    " OR ELSE on April Fools day...
    highlight ColorColumn ctermbg=red ctermfg=blue
    " exec 'set colorcolumn=' . join(range(2,80,3), ',')


"====[ Make tabs, trailing whitespace, and non-breaking spaces visible ]======

    exec "set listchars=tab:\uBB\uBB,trail:\uB7,nbsp:~,eol:$"
    set listchars+=precedes:<,extends:>
    set nolist


"====[ Swap : and ; to make colon commands easier to type ]======

    " nnoremap  ;  :
    " nnoremap  :  ;


"====[ Swap v and CTRL-V, because Block mode is more useful that Visual mode "]======

    nnoremap    v   <C-V>
    nnoremap <C-V>     v

    vnoremap    v   <C-V>
    vnoremap <C-V>     v


"====[ Always turn on syntax highlighting for diffs ]=========================

    if &diff
      colorscheme default
      colorscheme ron
      set background=dark
    endif

    " EITHER select by the file-suffix directly...
    augroup PatchDiffHighlight
        autocmd!
        autocmd BufEnter  *.patch,*.rej,*.diff   syntax enable
    augroup END

    " OR ELSE use the filetype mechanism to select automatically...
    filetype on
    augroup PatchDiffHighlight
        autocmd!
        autocmd FileType  diff   syntax enable
    augroup END


"====[ Mappings to activate spell-checking alternatives ]================

    nmap  <Leader>s     :set invspell spelllang=en<CR>
    nmap  <Leader>ss    :set    spell spelllang=en-basic<CR>

    " To create the en-basic (or any other new) spelling list:
    "
    "     :mkspell  ~/.vim/spell/en-basic  basic_english_words.txt
    "
    " See :help mkspell

"====[ Make CTRL-K list diagraphs before each digraph entry ]===============

    inoremap <expr> <C-K>:call ShowDigraphs()

    function! ShowDigraphs ()
        digraphs
        call getchar()
        return "\<C-K>"
    endfunction

    " But also consider the hudigraphs.vim and betterdigraphs.vim plugins,
    " which offer smarter and less intrusive alternatives
    " œ ŋ  ß
