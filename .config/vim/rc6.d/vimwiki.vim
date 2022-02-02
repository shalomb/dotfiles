let wiki = {}
let wiki.name = 'wiki'
let wiki.path = '~/wiki/'
let wiki.path_html = '~/wiki/html/'
let wiki.auto_diary_index = 0
let wiki.syntax = 'markdown'
let wiki.auto_toc = 1
let wiki.auto_export = 1
let wiki.auto_generate_links = 1
let wiki.auto_generate_tags = 1
let wiki.auto_tags = 1
let wiki.ext = '.md'
let wiki.nested_syntaxes = {'ruby': 'ruby', 'python': 'python', 'c++': 'cpp', 'bash':'sh', 'sh': 'sh', 'racket': 'racket'}
let wiki.syntax = 'markdown'

let tips = {}
let tips.name = 'tips'
let tips.path = '~/tips/'
let tips.path_html = '~/tips/html/'
let tips.auto_diary_index = 0
let tips.syntax = 'markdown'
let tips.auto_toc = 1
let tips.auto_export = 1
let tips.auto_generate_links = 1
let tips.auto_generate_tags = 1
let tips.auto_tags = 1
let tips.ext = '.md'
let tips.nested_syntaxes = {'ruby': 'ruby', 'python': 'python', 'c++': 'cpp', 'sh': 'sh', 'racket': 'racket'}
let tips.syntax = 'markdown'

let g:vimwiki_list = [wiki, tips]

let g:vimwiki_auto_chdir = 1
let g:vimwiki_auto_header = 1
let g:vimwiki_autowriteall = 1
let g:vimwiki_conceal_pre = 1
let g:vimwiki_folding='expr'
let g:vimwiki_global_ext = 0
let g:vimwiki_hl_cb_checked = 2
let g:vimwiki_hl_headers = 1
let g:vimwiki_listsym_rejected = 'X'
let g:vimwiki_listsyms = ' ○◐●✓'
let g:vimwiki_markdown_header_style = 1
let g:vimwiki_use_calendar=0

au BufEnter *.md :syntax sync fromstart

let g:vimwiki_map_prefix = '<Leader>v'

nmap <Leader>wx <Plug>VimwikiIndex
nmap <Leader>wl i<c-r>="[" . expand("#") . "]" . "(./" . expand("#") . ")"<cr><esc>
nmap <Leader>ww <Plug>VimwikiFollowLink
nmap <Leader>ws <Plug>VimwikiVSplitLink
nmap <Leader>wn <Plug>VimwikiNextLink
nmap <Leader>wp <Plug>VimwikiPrevLink
nmap <Leader>wg <Plug>VimwikiGoto
" html conversion
nmap <leader>wH <Plug>Vimwiki2HTML
nmap <leader>wHH <Plug>Vimwiki2HTMLBrowse
" help menu
noremap <Leader>wh :map <lt>leader>w<cr>:map gl<cr>

" Avoid conflicts with textobj-word-column, etc by prefixing the vimwiki
" text object default keybindings with a 'w'
" so they spell out better - 'vwic', 'vwah', etc
omap wah <Plug>VimwikiTextObjHeader
vmap wah <Plug>VimwikiTextObjHeaderV
omap wih <Plug>VimwikiTextObjHeaderContent
vmap wih <Plug>VimwikiTextObjHeaderContentV
omap waH <Plug>VimwikiTextObjHeaderSub
vmap waH <Plug>VimwikiTextObjHeaderSubV
omap wiH <Plug>VimwikiTextObjHeaderSubContent
vmap wiH <Plug>VimwikiTextObjHeaderSubContentV
omap wa\ <Plug>VimwikiTextObjTableCell
vmap wa\ <Plug>VimwikiTextObjTableCellV
omap wi\ <Plug>VimwikiTextObjTableCellInner
vmap wi\ <Plug>VimwikiTextObjTableCellInnerV
omap wac <Plug>VimwikiTextObjColumn
vmap wac <Plug>VimwikiTextObjColumnV
omap wic <Plug>VimwikiTextObjColumnInner
vmap wic <Plug>VimwikiTextObjColumnInnerV
omap wal <Plug>VimwikiTextObjListChildren
vmap wal <Plug>VimwikiTextObjListChildrenV
omap wil <Plug>VimwikiTextObjListSingle
vmap wil <Plug>VimwikiTextObjListSingleV

highlight link VimwikiHeader1 Title
highlight link VimwikiHeader2 Title
highlight link VimwikiHeader3 Title
highlight link VimwikiHeader4 Title
highlight link VimwikiHeader5 Title
highlight link VimwikiHeader6 Title
highlight link VimwikiPre LineNr
highlight VimwikiLink cterm=underline ctermfg=cyan ctermbg=234
