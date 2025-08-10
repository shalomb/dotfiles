local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local config_reload_group = augroup("config_reload", { clear = true })

autocmd({ "BufWritePost", "FileWritePost" }, {
  group = config_reload_group,
  pattern = { "*/lua/config/*.lua", "*/lua/config/*.vim", vim.env.MYVIMRC },
  callback = function()
    local curfile = vim.fn.expand('%:p')
    if not curfile:match('^fugitive:') then
      vim.cmd("source " .. curfile)
    end
  end,
})
