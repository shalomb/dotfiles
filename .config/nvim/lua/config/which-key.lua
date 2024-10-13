-- which-key

local whichkey = require("which-key")

whichkey.setup({
  win = {
    border = "none", -- none, single, double, shadow
    no_overlap = true,
    padding = { 1, 2 },
    title = true,
    title_pos = "center",
    zindex = 1000,
  },
  plugins = {
    marks = true,     -- shows a list of your marks on ' and `
    registers = true, -- shows your registers on " in NORMAL or <C-r> in INSERT mode
    -- the presets plugin, adds help for a bunch of default keybindings in Neovim
    -- No actual key bindings are created
    spelling = {
      enabled = true,   -- enabling this will show WhichKey when pressing z= to select spelling suggestions
      suggestions = 20, -- how many suggestions should be shown in the list?
    },
    presets = {
      operators = true,    -- adds help for operators like d, y, ...
      motions = true,      -- adds help for motions
      text_objects = true, -- help for text objects triggered after entering an operator
      windows = true,      -- default bindings on <c-w>
      nav = true,          -- misc bindings to work with windows
      z = true,            -- bindings for folds, spelling and others prefixed with z
      g = true,            -- bindings for prefixed with g
    },
  },
  expand = 3,
  keys = {
    scroll_down = "<c-d>", -- binding to scroll down inside the popup
    scroll_up = "<c-u>",   -- binding to scroll up inside the popup
  },

})

whichkey.add({
  { "<leader>z",  group = "filez" }, -- optional group name
  { "<leader>zf",                    -- create a binding with label
    "<cmd>Telescope find_files<cr>"  -- "Find File"
  },
  {
    "<leader>zr",
    "<cmd>Telescope oldfiles<cr>",
    desc = "Open Recent File",
  },
  { "<leader>zn", "New File" },         -- just a label. don't create any mapping
  { "<leader>ze", "Edit File" },
  { "<leader>z1", "which_key_ignore" }, -- special label to hide it in the popup
  {
    "<leader>zb",                       -- you can also pass functions!
    function() print("bar") end,
    desc = "Foobar"
  },
})

-- -- Show hydra mode for changing windows
-- require("which-key").show({
--   keys = "<c-w>",
--   loop = true, -- this will keep the popup open until you hit <esc>
-- })
