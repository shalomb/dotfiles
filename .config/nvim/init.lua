-- lua

local vim = vim

vim.g.python3_host_skip_check = true
vim.g.python3_host_prog = '/usr/bin/python3'

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- settings needed before loading lazy
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- load lazy plugins
require("lazy").setup("plugins")

-- Load config
require("config")
