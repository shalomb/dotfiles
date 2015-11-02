"""" Keybindings """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
let mapleader = ","

nnoremap <CR>                         ``
" <CR> in the Command Line/QuickFix mode shouldn't be overridden
autocmd CmdwinEnter * nnoremap <CR> <CR>
autocmd BufReadPost quickfix nnoremap <CR> <CR>

cnoremap <C-$>                        <End>
cnoremap <C-^>                        <Home>
cnoremap %%                           <C-R>=expand('%:p:h').'/'<CR>
cnoremap w!!                          %!SUDO_ASKPASS=$(which ssh-askpass) sudo -A tee % > /dev/null
cnoremap <C-h>                        <Left>
cnoremap <C-l>                        <Right>
cnoremap <C-p>                        <Up>
cnoremap <C-n>                        <Down>


inoremap <A-C-Left>                   <esc>:tabprevious<cr>
inoremap <A-C-Right>                  <esc>:tabnext<cr>
inoremap <C-Left>                     <esc>:tabprevious<cr>
inoremap <C-Right>                    <esc>:tabnext<cr>
inoremap <C-S>                        <C-O>:update<CR>
inoremap <C-Enter>                    <C-o>o
inoremap <C-S-Enter>                  <C-o>O
inoremap <C-U>                        <C-G>u<C-U>
inoremap <C-W>                        <C-G>u<C-W>

nnoremap <C-Left>                     <Nop>
nnoremap <C-Right>                    <Nop>

" like tmux - c-w,c-w switches to previous window
nnoremap <C-W><C-W>                   <C-W>p

" nnoremap <buffer>          ;          :
" nnoremap <buffer>          :          ;

"nnoremap <buffer>     /               /\v
nnoremap <buffer>     <leader>sr      :,%s@\v@@gci<Left><Left><Left><Left><Left>

cnoremap %% <C-R>=fnameescape(expand('%:h:p')).'/'<cr>
map <leader>ee    :edit     %%
map <leader>es    :split    %%
map <leader>ev    :vsplit   %%
map <leader>et    :tabedit  %%

noremap  <buffer> <silent> k          gk
noremap  <buffer> <silent> j          gj
noremap  <buffer> <silent> 0          g0
noremap  <buffer> <silent> $          g$

noremap  <buffer> <silent> <C-e>      5<C-e>
noremap  <buffer> <silent> <C-y>      5<C-y>

nnoremap <expr>           gV          "`[".getregtype(v:register)[0]."`]"

nnoremap          .                   .`[
nnoremap          <A-C-Left>          <esc>:tabprevious<cr>
nnoremap          <A-C-Right>         <esc>:tabnext<cr>
nnoremap          <F2>                :NERDTreeToggle<CR>
nnoremap <silent> <C-Tab>             <C-W><C-W>    " control-tab to next window
" nnoremap <silent> P                   P`[   " jump back to position after put
" nnoremap <silent> p                   p`[   " jump back to position after put
  nnoremap <silent> Y                   y$
  nnoremap <silent> z/                  :if AutoHighlightToggle()<Bar>set hlsearch<Bar>endif<CR>
nnoremap <silent> z!                  :set hlsearch!<cr>
nnoremap          <leader>.           :ls<cr>:b<space>
nnoremap          <leader>'           :ls<cr>:b<space>
nnoremap          <leader>"           :ls<cr>:vs<space>#
nnoremap <silent> <leader>[           :silent if &virtualedit == ""<cr>set virtualedit=all<cr>else<cr>set virtualedit=<cr>endif<cr>
nnoremap <silent> <leader><space>     :edit #<cr>
nnoremap <silent> <leader><Tab>       <C-w><C-w>
nnoremap <silent> <leader>a           :edit #<cr>
nnoremap <silent> <leader>A           :execute "set titlestring=".input("Set window title to: ")<cr>
nnoremap <silent> <leader><C-a>       :edit #<cr>
nnoremap <silent> <leader>c           :new<cr>:only<cr>
nnoremap          <leader>e           :edit <C-R>=expand('%:h').'/'<CR>

nnoremap          <leader>ba          :ls<cr>:b<space>
nnoremap          <leader>be          :CommandTBuffer<cr>
nnoremap          <leader>bg          :LustyBufferGrep<cr>
nnoremap <silent> <leader>bc          :close<cr>
nnoremap <silent> <leader>bd          :bdelete<cr>
nnoremap <silent> <leader>bh          :bprevious<cr>
nnoremap <silent> <leader>bj          :blast<cr>
nnoremap <silent> <leader>bk          :bfirst<cr>
nnoremap <silent> <leader>bl          :bnext<cr>
nnoremap          <leader>bs          :ls<cr>:vsplit #
nnoremap          <leader>bS          :ls<cr>:split #

nnoremap          <leader>?           :help 
nnoremap <silent> <leader>,           :edit #<cr>

nnoremap <silent> <leader>g           :silent set visualbell!<cr>

" lusty-explorer.vim:1760
" VIM::command "silent! topleft 1split #{@title}"
nnoremap <silent> <leader>lb          :ls<cr>:LustyBufferExplorer<cr>
nnoremap <silent> <leader>lb          :LustyBufferExplorer<cr>
nnoremap <silent> <leader>lF          :LustyFilesystemExplorer<cr>
nnoremap <silent> <leader>lf          :LustyFilesystemExplorerFromHere<cr>
nnoremap <silent> <leader>lg          :LustyBufferGrep<cr>
nnoremap <silent> <leader>l           :redraw<cr>
nnoremap <silent> <leader>m           g<  " last set of messages
" nnoremap <silent> <leader>>         :new /tmp/exchange<cr>ggP`]a<cr><Esc>"_dGgg:w!<cr> " :close<cr>
" nnoremap <silent> <leader><         :new ~/.tmp/exchange<cr>ggyG<Esc>:w!<cr>:close<cr>
nnoremap <silent> <leader>>           :write! $TMP/exchange<cr>
nnoremap <silent> <leader><           :split  $TMP/exchange<cr>
nnoremap <silent> <leader>ncl         :set cursorline!    cursorline?<cr>
nnoremap <silent> <leader>ncc         :set cursorcolumn!  cursorcolumn?<cr>
nnoremap <silent> <leader>nh          :set hlsearch!      hlsearch?<cr>
nnoremap <silent> <leader>nl          :set list!          list?<cr>
nnoremap <silent> <leader>nm          :if &guioptions =~ 'm'<bar>  set guioptions-=m <bar>else<bar>  set guioptions+=m<bar>endif<cr>
nnoremap <silent> <leader>nn          :if &number == 1<bar>  set relativenumber<bar>else<bar>  set number<bar>endif<cr>
nnoremap <silent> <leader>no          :if &number == 1<bar>  set number!<bar>       else<bar>  set number<bar>endif<cr>
nnoremap <silent> <leader>np          :set paste!         paste?<cr>
nnoremap <silent> <leader>ns          :set spell!         spell?<cr>
nnoremap <silent> <leader>nw          :set wrap!          wrap?<cr>
nnoremap <silent> <leader>nt2         :set ts=2 sw=2 et   ts? sw? et?<cr>
nnoremap <silent> <leader>nt4         :set ts=4 sw=4 et   ts? sw? et?<cr>
nnoremap <silent> <leader>nt8         :set ts=8 sw=8 et   ts? sw? et?<cr>
nnoremap <silent> <leader>oh          :help <C-r><C-a><cr>
nnoremap <silent> <leader>od          :Vexplore<cr>
nnoremap <silent> <leader>oD          :!xdg-open %:h<cr>
nnoremap <silent> <leader>of          :!xdg-open %:p<cr>
nnoremap <silent> <leader>ofk         :vsplit ~/.fluxbox/keys<cr>
nnoremap <silent> <leader>ogk         :vsplit ~/.gitconfig<cr>:1;/\[alias\]<cr>zt
nnoremap <silent> <leader>otk         :vsplit ~/.tmux.conf<cr>:1;/keybindings<cr>zt
nnoremap <silent> <leader>ovk         :vsplit ~/.vimrc<cr>:1;/keybindings<cr>zt
" nnoremap <silent> <leader>oh        "zyw:execute ":help ".@z.""<cr>
nnoremap <silent> <leader>P           "+gP      "paste from gui-clipboard
nnoremap <silent> <leader>Q           :only<cr>
nnoremap <silent> <leader>r           :set wrap!<cr>
nnoremap <silent> <leader>S           :new<cr>
nnoremap <silent> <leader>sa          zg  " add word to dict
nnoremap <silent> <leader>sp          :set spell!<cr>
nnoremap <silent> <leader>sP          :!x-terminal-emulator -e ispell -x -t %<cr>:redraw<cr>
nnoremap          <leader>ta          :tabs<cr>:normal gt<Left><Left>
nnoremap <silent> <leader>tc          :tabnew<cr>
nnoremap <silent> <leader>td          :tabclose<cr>
nnoremap          <leader>te          :ls<cr>:tabedit #
nnoremap          <leader>tf          :tabfind **/*
nnoremap <silent> <leader>th          :tabprevious<cr>
nnoremap          <leader>tips        :cd ~/Desktop/tips<cr>:CommandTFlush<cr>:CommandT<cr>
" nnoremap          <leader>tips      :!(cd ~/Desktop/tips/; find * -type f \| column)<cr>:vsplit ~/Desktop/tips/
nnoremap <silent> <leader>tj          :tablast<cr>
nnoremap <silent> <leader>tk          :tabfirst<cr>
nnoremap <silent> <leader>tl          :tabnext<cr>
nnoremap <silent> <leader>tm          :tabmove<cr>
nnoremap <silent> <leader>tp          :tabprevious<cr><cr>
nnoremap <silent> <leader>tx          :tabdo<space>
nnoremap <silent> <leader>t^          :tabfirst<cr>
nnoremap <silent> <leader>t$          :tablast<cr>
nnoremap <silent> <leader>uv          :!x-terminal-emulator -e urlview % <cr>
nnoremap <silent> <leader>\|          :vnew<cr>
nnoremap <silent> <leader>vg          :vimgrep /<c-r>=expand('<cword>') . '/j **/*' <cr>
nnoremap          <leader>wr          :update<cr>
nnoremap <silent> <leader>x           :close<cr>
nnoremap <silent> <leader>Y           "+y   "copy

vnoremap <silent> <leader>Y           "+y   " copy
vnoremap <silent> <leader>D           "+x   " cut
vnoremap <silent> <leader>d           "+x   " cut
vnoremap <silent> <leader>x           "+x   " cut
vnoremap          z/                  y/<C-R>"<CR>gv " put selected text in the search buffer
vnoremap          <                   <gv   " move cursor to beginning of visual block move
vnoremap          >                   >gv   " move cursor to the end of a visual block move
vnoremap          <leader>##          :s/^/# /<cr>    " shell-type comments
vnoremap          <leader>#"          :s/^/" /<cr>    " vim-type comments
vnoremap          <leader>#//         :s@^@\/\/ @<cr> " c-type comments
vnoremap          <leader>v           :vimgrep <c-r>=expand('<cword>') . ' **/*' <cr>
vnoremap           <C-S>              <C-C>:update<CR>
vnoremap <silent> <leader>[           :silent if &virtualedit == ""<cr>set virtualedit=all<cr>else<cr>set virtualedit=<cr>endif<cr>

