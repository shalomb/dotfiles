-- lua

local vim = vim

vim.o.grepprg = "rg --smart-case --vimgrep --no-heading --follow --multiline-dotall --hidden --pcre2 --regexp"
vim.opt.grepformat = '%f:%l:%c:%m,%f:%l:%m'
