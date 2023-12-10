local whichkey = require("which-key")
local tsj = require('treesj')

local langs = { --[[ configuration for languages ]] }

tsj.setup({
  use_default_keymaps = false,
  max_join_length = 150,
})

whichkey.register({
  name = "chords",

  ["s"] = {
    ["j"] = {
      function()
        vim.cmd('TSJToggle')
      end,
      'TSJToggle',
    }
  }
}, { mode = "n", prefix = "<leader>" })
