" https://github.com/preservim/vim-markdown

let g:vim_markdown_auto_extension_ext = 'txt'
let g:vim_markdown_auto_insert_bullets = 1
let g:vim_markdown_autowrite = 1
let g:vim_markdown_conceal_code_blocks = 1
let g:vim_markdown_folding_disabled = 1
let g:vim_markdown_folding_style_pythonic = 1
let g:vim_markdown_follow_anchor = 1
let g:vim_markdown_frontmatter = 1
let g:vim_markdown_new_list_item_indent = 2
let g:vim_markdown_no_default_key_mappings = 1
let g:vim_markdown_override_foldtext = 0
let g:vim_markdown_strikethrough = 1
let g:vim_markdown_toc_autofit = 1

augroup preservim_vim_markdown
  autocmd!
  autocmd BufNewFile,BufRead *.markdown,*.mdown,*.mkd,*.mkdn,*.md  setfiletype markdown
  autocmd FileType markdown  let g:vim_markdown_no_default_key_mappings = 0
  autocmd FileType markdown  setlocal comments=fb:*,fb:-,fb:+,fb:@,n:> commentstring=<!--%s-->
  autocmd FileType markdown  setlocal expandtab tabstop=2 softtabstop=2 shiftwidth=2
  autocmd FileType markdown  setlocal formatlistpat=^\\s*\\d\\+\\.\\s\\+\\\|^\\s*[-*+]\\s\\+\\\|^\\[^\\ze[^\\]]\\+\\]:\\&^.\\{4\\}
  autocmd FileType markdown  setlocal formatoptions-=q
  autocmd FileType markdown  setlocal formatoptions+=t
  autocmd FileType markdown  setlocal textwidth=78
augroup end

