-- which-key

local whichkey = require("which-key")

whichkey.setup({
  window = {
    border = "single", -- none, single, double, shadow
    margin = { 0, 0, 0, 0 },
    padding = { 0, 0, 0, 0 }, --
    position = "bottom", -- bottom, top
  },
})

local opts = {
  buffer = nil, -- Global mappings. Specify a buffer number for buffer local mappings
  mode = "n", -- Normal mode
  noremap = true, -- use `noremap` when creating keymaps
  nowait = false, -- use `nowait` when creating keymaps
  prefix = "<leader>",
  silent = true, -- use `silent` when creating keymaps
}

whichkey.register({
  z = {
    name = "file", -- optional group name
    f = { "<cmd>Telescope find_files<cr>", "Find File" }, -- create a binding with label
    r = {
      "<cmd>Telescope oldfiles<cr>", "Open Recent File",
      noremap = false
    }, -- additional options for creating the keymap
    n = { "New File" }, -- just a label. don't create any mapping
    e = "Edit File", -- same as above
    ["1"] = "which_key_ignore", -- special label to hide it in the popup
    b = { function() print("bar") end, "Foobar" } -- you can also pass functions!
  },
}, opts)
