-- lua

-- sort.lua
-- implement a sort operator with 'gs' that works with text objects and is
-- dot-repeatable

local vim = vim
local _G = _G

-- https://www.vikasraj.dev/blog/vim-dot-repeat
function _G.__dot_repeat(motion, direction)
  if motion == nil then
    vim.o.operatorfunc = "v:lua.__dot_repeat"
    return "g@"
  end

  -- if motion == "char" then
  --   print("motion on the same line i.e., f{char} b{char} [count]w etc.")
  -- elseif motion == "line" then
  --   print("motion over multiple lines i.e., [count]k [count]j etc.")
  -- elseif motion == "block" then
  --   print("IDK when this happens")
  -- end

  local view = vim.fn.winsaveview()

  local range = {
    starting = vim.api.nvim_buf_get_mark(0, "["),
    ending = vim.api.nvim_buf_get_mark(0, "]"),
  }

  local start = range.starting[1]
  local endp = range.ending[1]

  vim.cmd(string.format([[:%s,%s sort u]], start, endp))

  vim.fn.winrestview(view)
end

vim.keymap.set("n", "gs", _G.__dot_repeat, { expr = true })
vim.keymap.set("v", "gs", _G.__dot_repeat, { expr = true })
