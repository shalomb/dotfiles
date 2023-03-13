-- config for ThePrimeagen/harpoon

-- require("telescope").load_extension('harpoon')

local vim = vim

local harpoon_ui = require('harpoon.ui')
local harpoon_tmux = require('harpoon.tmux')
local harpoon_mark = require('harpoon.mark')

require("telescope").load_extension('harpoon')

local whichkey = require("which-key")
whichkey.register({
  ["'"] = { require("harpoon.ui").toggle_quick_menu, "harpoon menu" },
  h = {
    name = "harpoon",
    a = {
      function()
        harpoon_mark.add_file()
        local file = vim.fn.expand('%')
        vim.fn.OK(file .. ' harpooned.')
      end, "harpoon mark"
    },
    e = { harpoon_ui.toggle_quick_menu, "harpoon menu" },
    h = { function() vim.cmd([[:Telescope harpoon marks]]) end, "harpoon marks" },
    t = { harpoon_tmux.gotoTerminal, "term 1" },
  },
}, { mode = "n", prefix = "<leader>" })

for i = 1, 9 do
  vim.keymap.set("n", "<leader>" .. i, function()
    harpoon_ui.nav_file(i)
  end, { expr = false, desc = string.format("h'poon %s", i) })
end

local group = vim.api.nvim_create_augroup("Harpoon Augroup", { clear = true })
vim.api.nvim_create_autocmd("FileType", {
  pattern = "harpoon",
  group = group,
  callback = function()
    vim.keymap.set("n", "<C-V>", function()
      local harpooned = vim.api.nvim_get_current_line()
      local pwd = vim.fn.getcwd() .. "/"
      vim.cmd("vsplit | edit " .. pwd .. harpooned)
    end, { buffer = true, noremap = true, silent = true })
  end,
})
