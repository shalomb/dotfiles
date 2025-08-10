local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local inactive_group = augroup('inactive_buffer_settings', { clear = true })

autocmd({ 'BufEnter', 'InsertLeave', 'CmdWinLeave', 'CmdlineLeave', 'ExitPre' }, {
  group = inactive_group,
  pattern = '*',
  command = 'set nu rnu cursorline'
})

autocmd({ 'BufLeave', 'InsertEnter', 'CmdWinEnter', 'CmdlineEnter' }, {
  group = inactive_group,
  pattern = '*',
  command = 'set nu nornu nocursorline'
})
