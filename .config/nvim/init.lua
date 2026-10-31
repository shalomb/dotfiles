-- lua

local vim = vim

-- Disable unneeded language providers
-- See :checkhealth provider
vim.g.loaded_perl_provider = 0
vim.g.loaded_ruby_provider = 0

vim.g.python3_host_skip_check = true
vim.g.python3_host_prog = '/usr/bin/python3'

-- Settings needed before loading plugins or config
vim.g.mapleader = " "
vim.g.maplocalleader = vim.g.mapleader

local pass_redact = require("config.pass_redact")

if pass_redact.is_pass_session() then
  -- Cleanroom mode for `pass edit`: skip lazy.nvim and all 3rd-party plugins,
  -- harden buffer/global options, and load only self-authored core config.
  pass_redact.setup()
  require("config")
  return
end

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

-- load lazy plugins
require("lazy").setup("plugins") -- ./lua/plugins.lua

-- Load config
require("config")
