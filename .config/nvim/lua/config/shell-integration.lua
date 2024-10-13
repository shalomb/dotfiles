-- lua

local whichkey = require("which-key")

whichkey.add({
  {
    "<leader>sh",
    group = "Shell Integration",
    name = "Shell Integration",
    mode = { "n" },
  },

  {
    "<leader>shx",
    function() vim.cmd(':!chmod +x %') end,
    desc = 'chmod +x %',
  }
})
