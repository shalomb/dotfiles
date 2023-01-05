-- lua

local vim = vim

vim.opt.grepprg='rg --vimgrep --no-heading --smart-case'
vim.opt.grepformat='%f:%l:%c:%m,%f:%l:%m'
