local neogen = require("neogen")
local whichkey = require("which-key")

whichkey.add({
  { "<leader>n", group = "neogen", mode = { "n" } },
  {
    "<leader>nc",
    function()
      neogen.generate()
    end,
    desc = 'Neogen generate annotation',
  },
  {
    "<leader>np",
    function()
      neogen.jump_prev()
    end,
    desc = 'Neogen jump prev',
  },
  {
    "<leader>nn",
    function()
      neogen.jump_next()
    end,
    desc = 'Neogen jump next',
  }
})
