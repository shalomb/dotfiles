-- indent-blankline

local highlight = {
    "RainbowGray",
}

local hooks = require "ibl.hooks"
-- create the highlight groups in the highlight setup hook, so they are reset
-- every time the colorscheme changes
hooks.register(hooks.type.HIGHLIGHT_SETUP, function()
    vim.api.nvim_set_hl(0, "RainbowGray", { fg = "#383838" })
end)

require("ibl").setup {
    indent = {
      highlight = highlight,
      char = "·"
    },
    whitespace = {
        highlight = highlight,
        remove_blankline_trail = false,
    },
    scope = {
      enabled = false
    },
}

hooks.register(hooks.type.SCOPE_HIGHLIGHT, hooks.builtin.scope_highlight_from_extmark)
