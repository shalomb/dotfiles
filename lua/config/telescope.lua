-- config for telescope

local builtin = require('telescope.builtin')

local actions = require 'telescope.actions'
local actions = require 'telescope.actions'
local finders = require 'telescope.finders'
local finders = require 'telescope.finders'
local pickers = require 'telescope.pickers'
local pickers = require 'telescope.pickers'
local sorters = require 'telescope.sorters'
local sorters = require 'telescope.sorters'
local state = require 'telescope.actions.state'

vim.api.nvim_set_hl(0, 'NormalFloat', { ctermfg = "LightGrey" })

vim.keymap.set('n', '<c-p>', builtin.find_files, {})
vim.keymap.set('n', '<leader>fb', builtin.buffers, {})
vim.keymap.set('n', '<leader>fc', builtin.commands, {})
vim.keymap.set('n', '<leader>ff', builtin.find_files, {})
vim.keymap.set('n', '<leader>/', builtin.live_grep, {})
vim.keymap.set('n', '<leader>fh', builtin.help_tags, {})
vim.keymap.set('n', '<leader>fm', builtin.marks, {})
vim.keymap.set('n', '<leader>fm', builtin.marks, {})

local builtins = require('telescope.builtin')
local arr = {}
for k,v in pairs(builtins) do
  table.insert(arr, k)
end

local function my_custom_picker(results)
  pickers.new(_, {
    prompt_title = 'Telescope Command Finder',
    finder = finders.new_table(results),
    sorter = sorters.fuzzy_with_index_bias(),
    attach_mappings = function(prompt_bufnr, _)
      actions.select_default:replace(function()
        actions.close(prompt_bufnr)
        local selection = state.get_selected_entry()
        local cmd = 'require("telescope.builtin").' .. selection[1]
        vim.cmd(':lua ' .. cmd .. '()')
        -- print(vim.inspect(selection[0]))
      end)
      return true
    end,
  }):find()
end

vim.keymap.set('n', '<leader>fn', function()
  my_custom_picker(arr)
end)

