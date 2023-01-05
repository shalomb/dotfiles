-- lua

local vim = vim
local M = {}

function M.qf_todo()
  local gitroot = vim.fnlocal.CurGitRoot()

  local myglob = function(glob)
    local globs = vim.fn.globpath(gitroot, glob)
    if globs ~= "" then
      return vim.split(globs, "\n")
    end
  end
  -- vim.fn.chdir(gitroot)

  -- https://neovim.io/doc/user/quickfix.html#getqflist-examples
  local filelist = {}
  local lines = {}

  for _, glob in pairs({ "**/todo.md", "**/TODO.md" }) do
    local matches = myglob(glob)
    if matches == {} or matches == nil then
      goto continue
    end
    for _, i in pairs(matches) do
      table.insert(filelist, i)
    end
    ::continue::
  end

  for _, l in pairs(filelist) do
    table.insert(lines, {
      filename = l,
      lnum = "$",
      col = 0,
      text = l,
    })
  end

  vim.fn.setqflist({}, "r", {
    id = vim.fn.getqflist({ id = 0 }).id,
    title = "TODO list",
    items = lines
  })
end

local whichkey = require("which-key")
whichkey.register({
  t = {
    name = "todo",
    d = { function()
      M.qf_todo()
      vim.cmd([[:copen]])
    end, "copen todos" },
  }
}, { mode = "n", prefix = "<leader>" })

return M
-- vim.cmd.copen()
