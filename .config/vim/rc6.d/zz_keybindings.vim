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
cnoremap <expr> <c-n> wildmenumode() ? "\<c-n>" : "\<down>"
cnoremap <expr> <c-p> wildmenumode() ? "\<c-p>" : "\<up>"

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

" noremap  <buffer> <silent> k          gk
" noremap  <buffer> <silent> j          gj
" noremap  <buffer> <silent> 0          g0
" noremap  <buffer> <silent> $          g$

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
vnoremap <silent> <leader>/           :<c-u>Rg <c-r>=fnameescape(GetVisualSelection())<cr><cr><cr>
nnoremap          <leader>.           :ls<cr>:b<space>
nnoremap          <leader>'           :Buffers<cr>
nnoremap          <leader>"           :ls<cr>:vs<space>#
nnoremap <silent> <leader><space>     :update<cr>:call ShowCrossHairs('20m')<cr>:echomsg(substitute(expand('%:p'), glob('~/'), '~/', '') . ' updated! ' . strftime('%FT%T%z')) . ' ' . substitute(getcwd(), glob('~'), '~', '')<cr>
nnoremap <silent> <leader>a           :edit #<cr>

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

nnoremap <leader>l :nohlsearch<cr>:diffupdate<cr>:syntax sync fromstart<cr><c-l>
nnoremap <leader>m  :<c-u><c-r><c-r>='let @'. v:register .' = '. string(getreg(v:register))<cr><c-f><left>

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
nnoremap <silent> <leader>v           :vsplit #<cr>
" nnoremap <silent> <leader>sp          :!x-terminal-emulator -e ispell -x -t %<cr>:redraw<cr>
nnoremap          <leader>t           :BTags<cr>
nnoremap          <leader>T           :Tags<cr>
" nnoremap <silent> <leader>uv          :!x-terminal-emulator -e urlview % <cr>
nnoremap <silent> <leader>\|          :vnew<cr>
nnoremap          <leader>q           :x<cr>

vnoremap          z/                  y/<C-R>"<CR>gv " put selected text in the search buffer

vnoremap          <                   <gv   " move cursor to beginning of visual block move
vnoremap          >                   >gv   " move cursor to the end of a visual block move
onoremap          gv                  :<c-u>normal! gv<cr>
nnoremap          gh                  :<c-u>verbose cd <c-r>=CurGitProjectRoot(CurDirectory())<cr><cr>:Vex<cr>

vnoremap          <leader>g           :<C-U>Ag <c-r>=expand('<cword>')<cr>
nnoremap          <leader>g           :Ag <c-r>=expand('<cword>')<cr>

vnoremap          <leader>#           :Commentary
nnoremap          <leader>#           :Commentary<CR>
nnoremap          <leader>gt          :Tweaks<cr>
nnoremap          <leader>gb          :Buffers<cr>
nnoremap          <leader>gf          :GFiles<cr>
nnoremap          <leader>gc          :Readme fzf<cr>
nnoremap          <leader>gg          :Tweaks<cr>
nnoremap <silent> <leader>gM           :Maps<cr>
nnoremap <silent> <leader>gB           :Buffers<cr>
nnoremap <silent> <leader>gF           :Files<cr>
silent!  nunmap   <leader>gC
nnoremap <silent> <leader>gC           :Command<cr>
nnoremap <silent> <leader>gL           :Lines<cr>

nnoremap          <leader>nn          :Lines<cr>
nnoremap          <leader>nb          :BLines<cr>
