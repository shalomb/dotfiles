-- config for ThePrimeagen/harpoon

require("telescope").load_extension('harpoon')

local harpoon_ui = require('harpoon.ui')
local harpoon_tmux = require('harpoon.tmux')
local harpoon_mark = require('harpoon.mark')

local map = vim.keymap.set
-- TODO find out how to map apostrophe in lua
vim.cmd([[
  map <leader>' :lua require("harpoon.ui").toggle_quick_menu()<cr>
]])

map("n", "<leader>he", function()
  harpoon_ui.toggle_quick_menu()
end)

map("n", "<leader>#", function()
  vim.cmd([[:Telescope harpoon marks]])
end)

map("n", "<leader>ht", function()
  harpoon_tmux.gotoTerminal(1)
end)

map("n", "<leader>ha", function()
  harpoon_mark.add_file()
  local file = vim.fn.expand('%')
  vim.fn.OK(file .. ' harpooned.')
end)

for i=1,9 do
  map("n", "<leader>" .. i, function()
    harpoon_ui.nav_file(i)
  end)
end
