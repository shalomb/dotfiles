" <CR> in the Command Line/QuickFix mode shouldn't be overridden
autocmd BufEnter     *        nnoremap <CR> <Nop>
autocmd CmdwinEnter  *        nnoremap <buffer> <CR> <CR>
autocmd BufReadPost quickfix  nnoremap <buffer> <CR> <CR>

cnoremap <C-$>                        <End>
cnoremap <C-^>                        <Home>
cnoremap %%                           <C-R>=fnameescape(expand('%:h:p')).'/'<cr>
cnoremap w!!                          %!SUDO_ASKPASS=$(which ssh-askpass) sudo -A tee % > /dev/null

cnoremap <C-h>                        <Left>
cnoremap <C-l>                        <Right>
cnoremap <C-p>                        <Up>
cnoremap <C-n>                        <Down>

inoremap <C-U>                        <C-G>u<C-U>
inoremap <C-W>                        <C-G>u<C-W>

nnoremap <C-Left>                     <Nop>
nnoremap <C-Right>                    <Nop>

" like tmux - c-w,c-w switches to previous window
nnoremap <C-W><C-W>                   <C-W>p

nnoremap                   <C-;>       :

nnoremap                   '           `
nnoremap                   `           '

nnoremap                  S          :,%s@\v@@gi<Left><Left><Left><Left>

noremap <leader>ee    :edit     <C-R>=fnameescape(expand('%:h:p')).'/'<CR>
noremap <leader>es    :split    <C-R>=fnameescape(expand('%:h:p')).'/'<CR>
noremap <leader>eg    :FZFNeighbours <CR>
noremap <leader>ev    :vsplit   <C-R>=fnameescape(expand('%:h:p')).'/'<CR>
noremap <leader>cd    :cd       <C-R>=fnameescape(expand('%:h:p')).'/'<CR>
noremap <leader>lcd   :lcd      <C-R>=fnameescape(expand('%:h:p')).'/'<CR>

noremap  <buffer> <silent> k          gk
noremap  <buffer> <silent> j          gj
noremap  <buffer> <silent> 0          g0
noremap  <buffer> <silent> $          g$

noremap  <buffer> <silent> <C-e>      5<C-e>
noremap  <buffer> <silent> <C-y>      5<C-y>

nnoremap <expr>           gV          "`[".getregtype(v:register)[0]."`]"

nnoremap                 g;           g;zvzz
nnoremap                 g,           g,zvzz

silent! vunmap            /
xnoremap                  //          y/<C-R>"<CR>

nnoremap                  .           .`[

nnoremap <silent> Y                   y$

nnoremap <silent> <leader>,           :edit #<cr>
nnoremap <silent> <leader>/           :Ag<cr>
nnoremap          <leader>.           :ls<cr>:b<space>
nnoremap          <leader>'           :Buffers<cr>
nnoremap          <leader>"           :ls<cr>:vs<space>#
nnoremap <silent> <leader><space>     :edit #<cr>
nnoremap <silent> <leader>a           :edit #<cr>
nnoremap <silent> <leader>M           :Maps<cr>
nnoremap <silent> <leader>B           :Buffers<cr>
nnoremap <silent> <leader>F           :Files<cr>
silent!  nunmap   <leader>C
nnoremap <silent> <leader>C           :Command<cr>
nnoremap <silent> <leader>L           :Lines<cr>

nnoremap          <leader>ba          :ls<cr>:b<space>
nnoremap <silent> <leader>bc          :close<cr>
nnoremap <silent> <leader>bd          :bdelete<cr>
nnoremap <silent> <leader>bh          :bprevious<cr>
nnoremap <silent> <leader>bj          :blast<cr>
nnoremap <silent> <leader>bk          :bfirst<cr>
nnoremap <silent> <leader>bl          :bnext<cr>
nnoremap          <leader>bs          :ls<cr>:vsplit #
nnoremap          <leader>bS          :ls<cr>:split #

nnoremap          <leader>?           :help <C-D>

nnoremap <silent> <leader>l           :redraw<cr>
nnoremap <silent> <leader>m           g<  " last set of messages

nnoremap <silent> <leader>nh          :set hlsearch!      hlsearch?<cr>
nnoremap <silent> <leader>nn          :set hlsearch!      hlsearch?<cr>
nnoremap <silent> <leader>nl          :set list!          list?<cr>
nnoremap <silent> <leader>np          :set paste!         paste?<cr>
nnoremap <silent> <leader>ns          :set spell!         spell?<cr>
nnoremap <silent> <leader>nw          :set wrap!          wrap?<cr>
nnoremap <silent> <leader>nt2         :set ts=2 sw=2 et   ts? sw? et?<cr>
nnoremap <silent> <leader>nt4         :set ts=4 sw=4 et   ts? sw? et?<cr>
nnoremap <silent> <leader>nt8         :set ts=8 sw=8 et   ts? sw? et?<cr>
nnoremap <silent> <leader>oh          :help <C-r><C-w><cr>
nnoremap <silent> <leader>od          :Vexplore<cr>
nnoremap <silent> <leader>oD          :!xdg-open %:h<cr>
nnoremap <silent> <leader>of          :!xdg-open %:p<cr>

" nnoremap <silent> <leader>oh        "zyw:execute ":help ".@z.""<cr>
nnoremap <silent> <leader>Q           :only<cr>
nnoremap <silent> <leader>S           :new<cr>
nnoremap <silent> <leader>V           :vnew<cr>
nnoremap <silent> <leader>v           :vsplit #
nnoremap <silent> <leader>sp          :!x-terminal-emulator -e ispell -x -t %<cr>:redraw<cr>
nnoremap          <leader>t           :BTags<cr>
nnoremap          <leader>T           :Tags<cr>
nnoremap <silent> <leader>uv          :!x-terminal-emulator -e urlview % <cr>
nnoremap <silent> <leader>\|          :vnew<cr>
silent! unmap <leader>wf
nnoremap          <leader>w           :write<cr>:echomsg(expand('%'))<cr>
nnoremap          <leader>q           :x<cr>
nnoremap <silent> <leader>x           :close<cr>

vnoremap          z/                  y/<C-R>"<CR>gv " put selected text in the search buffer

vnoremap          <                   <gv   " move cursor to beginning of visual block move
vnoremap          >                   >gv   " move cursor to the end of a visual block move
onoremap          gv                  :<c-u>normal! gv<cr>
nnoremap          gh                  :<c-u>verbose cd <c-r>=CurGitProjectRoot(CurDirectory())<cr><cr>:Vex<cr>

vnoremap          <leader>#           :Commentary
vnoremap          <leader>g           :<C-U>Ag <c-r>=expand('<cword>')<cr>

nnoremap          <leader>g           :Ag <c-r>=expand('<cword>')<cr>
nnoremap          <leader>#           :Commentary<CR>
