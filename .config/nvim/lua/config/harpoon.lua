-- config for ThePrimeagen/harpoon

-- require("telescope").load_extension('harpoon')

local vim = vim

local map = vim.keymap.set

local harpoon_ui = require('harpoon.ui')
local harpoon_tmux = require('harpoon.tmux')
local harpoon_mark = require('harpoon.mark')

require("telescope").load_extension('harpoon')

local whichkey = require("which-key")

whichkey.add({
  { "<leader>h", group = "harpoon" },
  { "<leader>'", require("harpoon.ui").toggle_quick_menu, desc = "h'poon menu" },
  {
    "<leader>ha",
    function()
      harpoon_mark.add_file()
      local file = vim.fn.expand('%')
      vim.fn.OK(file .. ' harpooned.')
    end,
    desc = "h'poon mark"
  },
  { "<leader>he", harpoon_ui.toggle_quick_menu,                         desc = "h'poon menu" },
  { "<leader>hh", function() vim.cmd([[:Telescope harpoon marks]]) end, desc = "h'poon marks" },
  { "<leader>ht", harpoon_tmux.gotoTerminal,                            desc = "term 1" },
  {
    "<leader>b",
    group = "buffers",
    expand = function()
      return require("which-key.extras").expand.buf()
    end
  },
})

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
    vim.keymap.set("n", "<C-N>", 'j', { buffer = true, silent = true })
    vim.keymap.set("n", "<C-P>", 'k', { buffer = true, silent = true })
    vim.keymap.set("n", "<C-J>", '<CR><CR>', { buffer = true, remap = true })

    vim.keymap.set("n", "<C-S>", function()
      local harpooned = vim.api.nvim_get_current_line()
      local pwd = vim.fn.getcwd() .. "/"
      vim.cmd("split | edit " .. pwd .. harpooned)
    end, { buffer = true, noremap = true, silent = true })

    vim.keymap.set("n", "<C-V>", function()
      local harpooned = vim.api.nvim_get_current_line()
      local pwd = vim.fn.getcwd() .. "/"
      vim.cmd("vsplit | edit " .. pwd .. harpooned)
    end, { buffer = true, noremap = true, silent = true })
  end,
})
