"""" easymotion config """""""""""""""""""""""""""""""""""""""""""""""""""""""""

" map <Leader> <Plug>(easymotion-prefix)
map <Leader> <Plug>(easymotion-prefix)

nmap s <Plug>(easymotion-s2)
nmap t <Plug>(easymotion-t2)

map  / <Plug>(easymotion-sn)
omap / <Plug>(easymotion-tn)

" These `n` & `N` mappings are options. You do not have to map `n` & `N` to
" EasyMotion.  Without these mappings, `n` & `N` works fine. (These mappings
" just provide different highlight method and have some other features )
map  n <Plug>(easymotion-next)
map  N <Plug>(easymotion-prev)

map <Leader>l <Plug>(easymotion-lineforward)
map <Leader>j <Plug>(easymotion-j)
map <Leader>J <Plug>(easymotion-jumptoanywhere)
map <Leader>k <Plug>(easymotion-k)
map <Leader>h <Plug>(easymotion-linebackward)

let g:EasyMotion_startofline = 0 " keep cursor column when JK motion

nmap s <Plug>(easymotion-s)
" Bidirectional & within line 't' motion
" This seems to break the c, d motions
" omap t <Plug>(easymotion-bd-TL)
" Use uppercase target labels and type as a lower case
let g:EasyMotion_use_upper = 1
 " type `l` and match `l`&`L`
let g:EasyMotion_smartcase = 1
" Smartsign (type `3` and match `3`&`#`)
let g:EasyMotion_use_smartsign_us = 1


