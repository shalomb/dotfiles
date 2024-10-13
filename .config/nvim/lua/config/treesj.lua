local whichkey = require("which-key")
local tsj = require('treesj')

local langs = { --[[ configuration for languages ]] }

tsj.setup({
  use_default_keymaps = false,
  max_join_length = 300,
})

whichkey.add({
  {
    "<leader>ts",
    group = "TreeSJ",
    name = "TreeSJ",
    mode = { "n" },
  },

  {
    "<leader>tsj",
    function() vim.cmd('TSJToggle') end,
    desc = 'treesj TSJToggle',
  }
})
