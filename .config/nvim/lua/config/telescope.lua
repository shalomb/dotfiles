-- config for telescope

local vim     = vim

local actions = require("telescope.actions")
local builtin = require("telescope.builtin")
local finders = require("telescope.finders")
local pickers = require("telescope.pickers")
local sorters = require("telescope.sorters")
local state   = require("telescope.actions.state")

-- vim.api.nvim_set_hl(0, 'NormalFloat', { ctermfg = "LightGrey" })

require("telescope").setup({
  defaults = {
    layout_config = {
      vertical = { width = 0.75 }
      -- other layout configuration here
    },
    mappings = {
      i = {
        -- map actions.which_key to <C-h> (default: <C-/>)
        -- actions.which_key shows the mappings for your picker,
        -- e.g. git_{create, delete, ...}_branch for the git_branches picker
        ["<C-h>"] = "which_key",
        ["<Up>"] = actions.cycle_history_prev,
        ["<Down>"] = actions.cycle_history_next,
      }
    }
    -- other defaults configuration here
  },
  -- other configuration values here
})

local arr = {}
for k, _ in pairs(builtin) do
  table.insert(arr, k)
end
