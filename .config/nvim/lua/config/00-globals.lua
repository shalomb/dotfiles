local vim = vim

vim.g.mapleader = " "
vim.g.maplocalleader = " "

vim.g.shell  = vim.fn.expand("$SHELL")
vim.g.vimdir = vim.fn.expand("$VIM")
vim.g.vimrc  = vim.fn.expand("$MYVIMRC")
vim.g.vimruntime  = vim.fn.expand("$VIMRUNTIME")

-- vim.g.packer_package_root = require('packer').config.package_root
vim.g.python3_host_prog = '/usr/bin/python3'

vim.g.editorconfig_enable = true -- nvim-0.9

-- runtime
vim.g.package_path = package.path

-- git
-- TODO this returns a lamba function
-- vim.g.git_root_dir = require("null-ls.utils").root_pattern(".git")

