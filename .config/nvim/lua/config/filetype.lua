local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local filetype_group = augroup("filetype_detect", { clear = true })

autocmd({ "BufWritePost", "FileWritePost" }, {
  group = filetype_group,
  pattern = "*",
  callback = function()
    if vim.bo.filetype == "" then
      vim.cmd("filetype detect")
    end
  end,
})
