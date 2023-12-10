local neogen = require("neogen")
local whichkey = require("which-key")

whichkey.register({
  name = "chords",

  ["n"] = {
    ["c"] = {
      function()
        neogen.generate()
      end,
      'Neogen generate annotation',
    },
    ["p"] = {
      function()
        neogen.jump_prev()
      end,
      'Neogen jump prev',
    },
    ["n"] = {
      function()
        neogen.jump_next()
      end,
      'Neogen jump next',
    }
  }
}, { mode = "n", prefix = "<leader>" })
