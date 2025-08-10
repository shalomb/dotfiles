--- buffer events
local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

-- autoupdate
augroup("autoupdate", { clear = true })
autocmd(
  {
    "BufLeave", "BufWinLeave", "CmdlineLeave", "FocusLost",
    "InsertLeave", "TabLeave", "Textchanged", "VimLeavePre", "WinLeave"
  }, {
    group = 'autoupdate',
    pattern = { '*' },
    callback = function()
      local buf = vim.api.nvim_win_get_buf(0)
      if not vim.api.nvim_get_option_value('readonly', { buf = buf }) and
          vim.api.nvim_get_option_value('modified', { buf = buf }) and
          vim.api.nvim_get_option_value('buftype', { buf = buf }) == "" and
          vim.fn.expand("%") ~= ""
      then
        vim.cmd([[silent update]])
        vim.fn.updatemsg()
      end
    end,
  }
)
