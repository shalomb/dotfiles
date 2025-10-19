local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local restore_group = augroup('restore_last_position', { clear = true })

autocmd('BufReadPost', {
  group = restore_group,
  pattern = '*',
  callback = function()
    local ft = vim.opt_local.filetype:get()
    if vim.fn.line("'\"") > 0 and vim.fn.line("'\"") <= vim.fn.line("$")
        and not ft:match("commit") and not ft:match("^fugitive")
    then
      vim.fn.setpos('.', vim.fn.getpos("'\""))
    end
  end
})

-- Also try BufWinEnter as a fallback
autocmd('BufWinEnter', {
  group = restore_group,
  pattern = '*',
  callback = function()
    local ft = vim.opt_local.filetype:get()
    if vim.fn.line("'\"") > 0 and vim.fn.line("'\"") <= vim.fn.line("$")
        and not ft:match("commit") and not ft:match("^fugitive")
    then
      vim.fn.setpos('.', vim.fn.getpos("'\""))
    end
  end
})

autocmd('VimEnter', {
  group = restore_group,
  pattern = '*',
  callback = function()
    if vim.o.filetype == "" and next(vim.fn.argv()) == nil then
      vim.fn.feedkeys('')
    end
  end
})
