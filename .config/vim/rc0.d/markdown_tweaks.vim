augroup markdown
  autocmd!

  autocmd BufRead,BufNewFile *.md,*.mkd,*.markdown
          \ setfiletype markdown

  " Don't hard break at right margin
  autocmd BufRead,BufNewFile *.md,*.mkd,*.markdown
          \ set formatoptions-=t
augroup END

