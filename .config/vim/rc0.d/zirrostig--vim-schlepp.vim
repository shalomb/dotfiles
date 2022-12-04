" :help schlepp

" https://github.com/zirrostig/vim-schlepp

vmap <unique> D <Plug>SchleppDup

" disable trailing whitespace trimming
let g:Schlepp#dupTrimWS = 1 

vmap <unique> <up>    <Plug>SchleppUp
vmap <unique> <down>  <Plug>SchleppDown
vmap <unique> <left>  <Plug>SchleppLeft
vmap <unique> <right> <Plug>SchleppRight

vmap <unique> Dk <Plug>SchleppDupUp
vmap <unique> Dj <Plug>SchleppDupDown
vmap <unique> Dh <Plug>SchleppDupLeft
vmap <unique> Dl <Plug>SchleppDupRight
