local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local resize_group = augroup('window_resize', { clear = true })

autocmd('VimResized', {
  group = resize_group,
  callback = function()
    vim.cmd('wincmd =')
  end
})
