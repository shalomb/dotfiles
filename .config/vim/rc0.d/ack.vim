" Settings for ack

" These are not necessarily related to those setup by ack.vim

if executable('ack')
  set grepprg=ack\ --smart-case\ --known-types\ --nocolor
  set grepformat^=%f:%l:%c:%m
endif

:cabbrev grep <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'silent grep' : 'grep')<CR>
