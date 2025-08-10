local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

-- Quickfix window management
local qf_group = augroup("auto_open_qf", { clear = true })
autocmd("QuickFixCmdPost", {
  group = qf_group,
  pattern = "[^l]*",
  command = "cwindow"
})
autocmd("QuickFixCmdPost", {
  group = qf_group,
  pattern = "l*",
  command = "lwindow"
})
autocmd("BufReadPost", {
  group = qf_group,
  pattern = "qf",
  callback = function()
    vim.cmd("setlocal nobuflisted")
    vim.cmd("wincmd J")
  end,
})

-- Quickfix keymap
local quickfix_group = augroup('quickfix_settings', { clear = true })
autocmd('BufReadPost', {
  group = quickfix_group,
  pattern = 'quickfix',
  callback = function()
    vim.keymap.set("n", "<cr>", "<cr>", { noremap = true, buffer = true })
  end
})

-- Cmdwin keymap
local cmdwin_group = augroup('cmdwin_settings', { clear = true })
autocmd('CmdWinEnter', {
  group = cmdwin_group,
  pattern = '*',
  callback = function()
    vim.keymap.set("n", "<cr>", "<cr>", { noremap = true, buffer = true })
  end
})
