local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local whitespace_group = augroup('extraneous_whitespace', { clear = true })

-- Highlight extraneous whitespace
vim.api.nvim_set_hl(0, 'ExtraneousWhitespace', { bg = 'red', underline = false })

autocmd({ 'BufEnter', 'InsertLeave' }, {
  group = whitespace_group,
  callback = function()
    vim.fn.matchadd('ExtraneousWhitespace', [[/\v(\S\zs\s+$| +\zs\t|\t\ze +)/]])
  end
})

autocmd('InsertEnter', {
  group = whitespace_group,
  callback = function()
    vim.fn.matchadd('ExtraneousWhitespace', [[/\v\s+\%#\@<!$/]])
  end
})

-- Remove trailing whitespace on buffer create/write
autocmd({ 'BufCreate', 'BufWritePre' }, {
  group = whitespace_group,
  callback = function()
    vim.cmd([[:silent! %s/\v\s+$//ge]])
  end
})
