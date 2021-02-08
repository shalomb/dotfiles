" Make v1 default as v0 is deprecated now
let g:snipMate = { 'snippet_version' : 1 }

" Tab is over-polluted with many plugins contending to use it
" Tab is evil?!
imap <C-j> <Plug>snipMateNextOrTrigger
smap <C-j> <Plug>snipMateNextOrTrigger
