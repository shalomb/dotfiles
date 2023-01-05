-- lua

local vim = vim

local leap = require('leap')
leap.add_default_mappings()

vim.api.nvim_create_augroup("reload_leap_hilights", { clear = true })
vim.api.nvim_create_autocmd(
  { 'ColorScheme' }, {
  group    = 'reload_leap_hilights',
  pattern  = '*',
  callback = function()
    leap.init_highlight(true)
  end
})
