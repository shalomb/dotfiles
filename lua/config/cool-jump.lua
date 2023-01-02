-- lua
local vim = vim
local hop = require('hop')
local hint = require('hop.hint')
local jump_target = require('hop.jump_target')

vim.keymap.set('', '<leader>W',
function ()
  local regex = hop.get_input_pattern('/', nil, hop.opts)
  -- local regex = "[^ \t]\\+"
  local generator = jump_target.jump_targets_by_scanning_lines
  local hints = generator(jump_target.regex_by_searching(regex))

  vim.fn.setreg('/', regex)
  vim.fn.histadd('/', regex)

  hop.opts.direction = hint.HintDirection.AFTER_CURSOR
  hop.hint_with(hints, hop.opts)
end)
