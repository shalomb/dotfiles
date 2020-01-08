" easymotion config

let g:EasyMotion_do_mapping = 0
let g:EasyMotion_do_shade = 1
let g:EasyMotion_use_smartsign_us = 1
let g:EasyMotion_prompt = '{n}>>> '
let g:EasyMotion_keys='hkyuiopnml,qwertzxcvbasdgjf;'
let g:EasyMotion_smartcase = 1
let g:EasyMotion_startofline = 0
let g:EasyMotion_startofline = 0 " keep cursor column when JK motion
let g:EasyMotion_use_smartsign_us = 1
let g:EasyMotion_use_upper = 0

function! s:config_easyfuzzymotion(...) abort
  return extend(copy({
  \   'converters': [incsearch#config#fuzzy#converter()],
  \   'modules': [incsearch#config#easymotion#module()],
  \   'keymap': {"\<CR>": '<Over>(easymotion)'},
  \   'is_expr': 0,
  \   'is_stay': 1
  \ }), get(a:, 1, {}))
endfunction

noremap <silent><expr>  / incsearch#go(<SID>config_easyfuzzymotion({'command': '/'}))
noremap <silent><expr>  ? incsearch#go(<SID>config_easyfuzzymotion({'command': '?'}))
noremap <silent><expr> g? incsearch#go(<SID>config_easyfuzzymotion({'is_stay':  1}))

map   <Leader>F <Plug>(easymotion-linebackward)
map   <Leader>f <Plug>(easymotion-lineforward)
map   <Leader>j <Plug>(easymotion-j)
map   <Leader>k <Plug>(easymotion-k)

" map  n <Plug>(easymotion-next)
" map  N <Plug>(easymotion-prev)

nmap  <Leader>wf <Plug>(easymotion-overwin-f2)
nmap s <Plug>(easymotion-s)
nmap s <Plug>(easymotion-s2)
map zg/ <Plug>(incsearch-fuzzy-stay)
