-- Minimal, isolated init for headless plugin tests (plenary busted).
-- Uses plugins already installed by lazy.nvim; does NOT load the full config.
local lazy = vim.fn.stdpath("data") .. "/lazy"
for _, name in ipairs({ "plenary.nvim", "mermaid.nvim" }) do
  vim.opt.rtp:append(lazy .. "/" .. name)
end
vim.opt.rtp:append(vim.fn.getcwd())
vim.cmd("runtime! plugin/*.lua plugin/*.vim")
vim.cmd("runtime! ftdetect/*.lua")
vim.g.mapleader = " "
vim.o.expandtab = true
