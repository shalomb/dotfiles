-- lua

local vim = vim

-- Disable unneeded language providers
-- See :checkhealth provider
vim.g.loaded_perl_provider = 0
vim.g.loaded_ruby_provider = 0

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
vim.g.maplocalleader = vim.g.mapleader

-- load lazy plugins
require("lazy").setup("plugins")

-- Load config
require("config")
