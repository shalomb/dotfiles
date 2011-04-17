"""" Pathogen  """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
filetype off
call pathogen#helptags()
call pathogen#runtime_append_all_bundles()

"""" Options """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
set more                    " page on extended output

let $PAGER='less'           " less is my pager
let $LESS=$PAGER            " to reiterate - less is my pager
" set term=$TERM            " term is $TERM
set more                    " page on extended output

set backupdir=/tmp          " put backups in /tmp
set backupdir-=.            " ...and not in cwd

" set background=light       " vim has a dark background when in the console
set novisualbell            " now that beep is a croak
set hidden                  " hide, don't close, undisplayed buffers
set history=256             " keep 50 lines of command history
set laststatus=2            " always show status line

set statusline=%<%9*%F\ %*%M%r\ %h%Y%w\ %{&ff}\ %=%-14.(%l/%L,%c%V\ (%P)%)\ \ %o,0x%O\ \ %b,0x%B\ \ \ %N,%n 
highlight User9 guifg=red

set shortmess=fimnrwxatIWO  " Get rid of most messages
set cmdheight=2             " Set command height to 2 to avoid netrw pains
set report=1                " Always report changes
set ruler                   " display cursor position
set cursorline              " highlight the current line
" set cursorcolumn            " highlight the current column
set showcmd                 " show command-in-progress
set showmode                " mode shown
set title                   " do set the xterm title (see 'titleold', set below)

set foldcolumn=2            " no fold column
set foldlevelstart=0        " start with all folds closed
set foldmethod=syntax       " Syntax highlighting items specify folds.

set formatoptions=r         " r - re-insert comment leader on newline
set terse                   " add 's' to 'shortmess'
set timeout                 " allow keys to timeout
set wildmenu                " enable menu of completions
set wildmode=full           " Complete longest common string, then each full match
set wildcharm=<C-Z>         " keybinding that charms the wild complete

if has('mouse')
  set mouse=a                 " mouse is available in all modes
  set mousemodel=popup_setpos
  set mousehide               " hide the mouse when busy
endif

set backspace=2             " correct backspace to return to previous lines

set incsearch               " searches are displayed on-the-fly
set hlsearch                " searches are highlighted
set ignorecase              " ignore case when searching
set smartcase               " except when searching upper case patterns
set wrapscan                " wrap around EOF on searches

set tabstop=2               " 2 characters
set softtabstop=2           " tabs are always 'tabstop' positions
set shiftwidth=2            " 2 characters
set expandtab               " expand tabs to spaces
set smarttab                " smart tab size
set shiftround              " indent rounded to shiftwidth

set number                  " turn on line numbers
set numberwidth=3           " with 3 digits by default

set wrap                    " wrap long lines
set wrapmargin=2            " clear 2 at the RHS
set linebreak               " soft-break at non-word characters
set nolist                  " soft-wrap seems to play up if list is set
set splitright              " create new splits to the right of the current window

set scrolloff=2             " keep cursor in middle of screen
set autoread                " autoload file when modified externally
set hidden                  " mark modified buffers hidden automatically

filetype plugin indent on   " try and guess what type of file
filetype detect
syntax on
syntax enable               " as per user's definition
set fileformat=unix         " no CR-LF, just plain newlines
set autoindent              " try and be smart about indenting
set smartindent             " C like indenting
set cindent                 " done better
set copyindent              " make autoindent use the same characters to indent
set nojoinspaces      

set showmatch               " show matching braces, parantheses, brackets, etc
set matchpairs+=<:>         " show and % jump matching angle brackets
set matchpairs+==:;         "                          variable assignments, etc
set matchtime=5             " Show match for 0.2 sec
set showcmd                 " show input command??

set pastetoggle=<F11>

set spelllang=en_gb
set spellfile=~/.vim/spell/en.utf-8.add

set iskeyword+=:

set path=.,~,..,
let &path = &path . "," . $OLDPWD

"""" Multibyte Support """"""""""""""""""""""""""""""""""""""""""""""""""""""""
set fileencodings=latin1,utf-8 " encode files in latin1 and utf-8
if has("multi_byte")
  if &termencoding == ""
    let &termencoding = &encoding
  endif
  set encoding=utf-8
  setglobal fileencoding=utf-8 bomb
  set fileencodings=ucs-bom,utf-8,latin1
endif

"""" Calc """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" VT1235 - a calc command
command! -nargs=+ Calc :perl VIM::Msg(<args>)
:cabbrev calc <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Calc' : 'calc')<CR>

"""" CD """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" cd to directory of the current file
function! CD()
  if bufname("") !~ "://"
    lcd %:p:h
  endif
endfunction
" autocmd BufEnter * call CD()

"""" tips """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"  Edits the file named as the argument in the ~/Desktop/info directory.
function! s:tips(arg)
  cd ~/Desktop/info/
  let l:files=split(glob("*".a:arg."*"), "\n")

  if len(l:files)
    for l:file in l:files
      execute "split " . l:file
    endfor
  else
    silent execute "split " . a:arg
    echo "New File : " . a:arg
  endif

endfunc

command! -nargs=1 Tips :silent call s:tips(<q-args>)
cabbrev tips <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Tips' : 'tips')<CR>

command! -nargs=* MyMap :!grep map.*<q-args> ~/.{g,}vimrc
cabbrev mymap <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'MyMap' : 'mymap')<CR>

"""" man """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
runtime ftplugin/man.vim
:cabbrev man <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'Man' : 'man')<CR>

"""" Project.vim Tweaks """""""""""""""""""""""""""""""""""""""""""""""""""""""
map <A-S-p> :Project<CR>
map <A-S-o> :Project<CR>:redraw<CR>/
nmap <silent> <F3> <Plug>ToggleProject
let g:proj_window_width = 48
let g:proj_window_increment = 32

"""" Persistent Undo """"""""""""""""""""""""""""""""""""""""""""""""""""""""""

if v:version >= 703   " when undodir was introduced
  set undodir=~/.vim/undo
  set undofile

  au BufWritePre /tmp/* setlocal noundofile
  set undolevels=8192       " maximum number of changes that can be undone
  set undoreload=9216       " maximum number lines to save for undo on a buffer reload

  function! ReadUndo()
    let _undofile = &undodir . expand("%:p") . '.undo'

    if filereadable(_undofile)
      silent execute ":rundo " . _undofile
    endif
  endfunc

  function! WriteUndo()
    let _undofile = &undodir . expand("%:p") . '.undo'
    let _undodir = matchstr(_undofile, "^.*\/")

    if !isdirectory(_undodir)
      silent execute "!mkdir -p " . _undodir
    endif
    silent execute "wundo! " . _undofile
  endfunc

  au BufReadPost * call ReadUndo()
  au BufWritePost * call WriteUndo()
endif

"""" AutoHighlightToggle """"""""""""""""""""""""""""""""""""""""""""""""""""""
" http://vim.wikia.com/wiki/Auto_highlight_current_word_when_idle
function! AutoHighlightToggle()
  let @/ = ''
  if exists('#auto_highlight')
    au! auto_highlight
    augroup! auto_highlight
    setl updatetime=4000
    echo 'AutoHiglight: OFF'
    return 0
  else
    augroup auto_highlight
      au!
      au CursorHold * let @/ = '\V\<'.escape(expand('<cword>'), '\').'\>'
    augroup end
    setl updatetime=500
    echo 'AutoHighlight: ON'
    return 1
  endif
endfunction

"""" SuperTab tweaks """"""""""""""""""""""""""""""""""""""""""""""""""""""""""
" let g:SuperTabMidWordCompletion     = 1
" let g:SuperTabDefaultCompletionType = "context"

"""" printexpr """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function! PrintFile(fname)
  call system("a2ps " . a:fname . " -o /tmp/test/fname")
  call delete(a:fname)
  return v:shell_error
endfunc
set printexpr=PrintFile(v:fname_in)

"""" Autocmds """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
autocmd BufNewFile,Bufread    *.csv     setfiletype csv
autocmd FileType perl                   setlocal keywordprg=perldoc\ -T\ -f
                                        " Open_a_Perl_module_from_its_module_name
" autocmd BufWritePost          .vimrc    source ~/.vimrc

"""" GVim tweaks """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" GUI specific tweaks, incase .gvimrc isn't loaded.
if has("gui_running")
  colorscheme koehler
endif

highlight clear
highlight Normal ctermbg=black ctermfg=grey
highlight Search guibg=DarkRed guifg=Gray ctermbg=DarkRed ctermfg=Gray

"""" Reset Cursor Position """"""""""""""""""""""""""""""""""""""""""""""""""""
" http://vim.wikia.com/wiki/Restore_cursor_to_file_position_in_previous_editing_session
set viminfo='10,\"100,:20,%,n~/.vim/viminfo

function! ResCur()
  if line("'\"") <= line("$")
    normal! g`"
    return 1
  endif
endfunction

augroup resCur
  autocmd!
  autocmd BufWinEnter * call ResCur()
augroup END

"""" Command-T """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
let g:CommandTMatchWindowAtTop = 1

"""" abbrevs """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

"""" Keybindings """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
let mapleader = ","

cnoremap <C-$>                        <End>
cnoremap <C-^>                        <Home>
cnoremap %%                           <C-R>=expand('%:h').'/'<CR>

inoremap <A-C-Left>                   <esc>:tabprevious<cr>
inoremap <A-C-Right>                  <esc>:tabnext<cr>
inoremap <C-S>                        <C-O>:update<CR>
inoremap <C-Enter>                    <C-o>o
inoremap <C-S-Enter>                  <C-o>O

nnoremap          .                   .`[
nnoremap          <A-C-Left>          <esc>:tabprevious<cr>
nnoremap          <A-C-Right>         <esc>:tabnext<cr>
nnoremap          <F2>                :NERDTreeToggle<CR>
nnoremap          <F8>                :!xdg-open %:p:h<cr> " open $PWD
nnoremap          <F9>                :!xdg-open %:p<cr>
nnoremap <silent> <C-Tab>             <C-W><C-W>    " control-tab to next window
nnoremap <silent> P                   P`[
nnoremap <silent> p                   p`[  " jump back to first char of prev changed text
nnoremap <silent> Y                   y$
nnoremap <silent> z/                  :if AutoHighlightToggle()<Bar>set hlsearch<Bar>endif<CR>
nnoremap <silent> z!                  :set hlsearch!<cr>
nnoremap          <leader>'     			:ls<cr>:b<space>
nnoremap          <leader>"     			:ls<cr>:b<space>
nnoremap <silent> <leader>[     			:silent if &virtualedit == ""<cr>set virtualedit=all<cr>else<cr>set virtualedit=<cr>endif<cr>
nnoremap <silent> <leader><space>     :edit #<cr>
nnoremap <silent> <leader><Tab> 			<C-w><C-w>

nnoremap <silent> <leader>a           :edit #<cr>
nnoremap <silent> <leader>A           :execute "set titlestring=".input("Set window title to: ")<cr>
nnoremap <silent> <leader><C-a>       :edit #<cr>
nnoremap <silent> <leader>c     			:new<cr>:only<cr>
nnoremap          <leader>e           :edit <C-R>=expand('%:h').'/'<CR>
nnoremap          <leader>f           :CommandT<cr>
nnoremap <silent> <leader>b0          :b 0<cr>
nnoremap <silent> <leader>b1          :b 1<cr>
nnoremap <silent> <leader>b2          :b 2<cr>
nnoremap <silent> <leader>b3          :b 3<cr>
nnoremap <silent> <leader>b4          :b 4<cr>
nnoremap <silent> <leader>b5          :b 5<cr>
nnoremap <silent> <leader>b6          :b 6<cr>
nnoremap <silent> <leader>b7          :b 7<cr>
nnoremap <silent> <leader>b8          :b 8<cr>
nnoremap <silent> <leader>b9          :b 9<cr>
nnoremap <silent> <leader>bd          :bdelete<cr>
nnoremap <silent> <leader>b^          :bfirst<cr>
nnoremap <silent> <leader>b$          :blast<cr>
nnoremap          <leader>be          :LustyBufferExplorer<cr>
nnoremap          <leader>bg          :LustyBufferGrep<cr>
nnoremap <silent> <leader>bh          :bprevious<cr>
nnoremap          <leader>ba          :ls<cr>:b<space>
nnoremap <silent> <leader>bl          :bnext<cr>
nnoremap <silent> <leader>d     			:bdelete<cr>
nnoremap <silent> <leader>g     			:silent set visualbell!<cr>
nnoremap <silent> <leader>?     			:help h<cr>
nnoremap <silent> <leader>,     			:help usr_01.txt<cr>
nnoremap <silent> <leader>k     			:bdelete<cr>
nnoremap <silent> <leader>lb          :LustyBufferExplorer<cr>
nnoremap <silent> <leader>lF          :LustyFilesystemExplorer<cr>
nnoremap <silent> <leader>lf          :LustyFilesystemExplorerFromHere<cr>
nnoremap <silent> <leader>lg          :LustyBufferGrep<cr>
nnoremap <silent> <leader>l     			:redraw<cr>
nnoremap <silent> <leader>m     			g<  " last set of messages
nnoremap <silent> <leader>nh     			:noh<cr>
nnoremap <silent> <leader>>     			:new /tmp/screen-exchange<cr>ggP`]a<cr><Esc>"_dGgg:w!<cr> " :close<cr>
nnoremap <Silent> <leader>]     			:new /tmp/screen-exchange<cr>ggyG<Esc>:e #<cr>p
nnoremap <silent> <leader><     			:new /tmp/screen-exchange<cr>ggyG<Esc>:w!<cr>:close<cr>
nnoremap <silent> <leader>P           "+gP      "paste
nnoremap <silent> <leader>Q     			:only<cr>
nnoremap <silent> <leader>r     			:set wrap!<cr>
nnoremap <silent> <leader>sa          zg
nnoremap <silent> <leader>S     			:new<cr>
nnoremap <silent> <leader>sp          :set spell!<cr>
nnoremap <silent> <leader>t0          0gt
nnoremap <silent> <leader>t1          1gt
nnoremap <silent> <leader>t2          2gt
nnoremap <silent> <leader>t3          3gt
nnoremap <silent> <leader>t4          4gt
nnoremap <silent> <leader>t5          5gt
nnoremap <silent> <leader>t6          6gt
nnoremap <silent> <leader>t7          7gt
nnoremap <silent> <leader>t8          8gt
nnoremap <silent> <leader>t9          9gt
nnoremap          <leader>ta          :tabs<cr>:normal gt<Left><Left>
nnoremap <silent> <leader>tc          :tabnew<cr>
nnoremap <silent> <leader>td          :tabclose<cr>
nnoremap          <leader>te          :tabedit <C-R>=expand('%:h').'/'<CR>
nnoremap          <leader>tf          :tabfind **/*
nnoremap <silent> <leader>th          :tabprevious<cr>
nnoremap <silent> <leader>tl          :tabnext<cr>
nnoremap <silent> <leader>tm          :tabmove<cr>
nnoremap <silent> <leader>tp          :tabprevious<cr><cr>
nnoremap <silent> <leader>tx          :tabdo<space>
nnoremap <silent> <leader>t^          :tabfirst<cr>
nnoremap <silent> <leader>t$          :tablast<cr>
nnoremap <silent> <leader>\|          :vnew<cr>
nnoremap <silent> <leader>v           :vimgrep /<c-r>=expand('<cword>') . '/j **/*' <cr>
nnoremap <silent> <leader>wh          <C-W>h
nnoremap <silent> <leader>wj          <C-W>j
nnoremap <silent> <leader>wk          <C-W>k
nnoremap <silent> <leader>wl          <C-W>l
nnoremap          <leader>wr          :update<cr>
nnoremap <silent> <leader>X           :close<cr>
nnoremap <silent> <leader>y           "+y   "copy

vnoremap <silent> <leader>D           "+x  "cut
vnoremap <silent> <leader>d           "+x   "cut
vnoremap          z/                  y/<C-R>"<CR>
vnoremap          <                   <gv   " move cursor to beginning of visual block move
vnoremap          >                   >gv
vnoremap          <leader>#           :s/^/#/<cr>
vnoremap          <leader>v           :vimgrep <c-r>=expand('<cword>') . ' **/*' <cr>
vnoremap           <C-S>              <C-C>:update<CR>


