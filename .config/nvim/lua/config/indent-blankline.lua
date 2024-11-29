-- indent-blankline

local highlight = {
    "RainbowGray1",
    "RainbowGray2",
    "RainbowGray3",
    "RainbowGray4",
    "RainbowGray5",
    "RainbowGray6",
    "RainbowGray7",
    "RainbowGray8",
}

local hooks = require "ibl.hooks"
-- create the highlight groups in the highlight setup hook, so they are reset
-- every time the colorscheme changes
hooks.register(hooks.type.HIGHLIGHT_SETUP, function()
    vim.api.nvim_set_hl(0, "RainbowGray1", { fg = "#383838" })
    vim.api.nvim_set_hl(0, "RainbowGray2", { fg = "#484848" })
    vim.api.nvim_set_hl(0, "RainbowGray3", { fg = "#585858" })
    vim.api.nvim_set_hl(0, "RainbowGray4", { fg = "#787878" })
    vim.api.nvim_set_hl(0, "RainbowGray5", { fg = "#888888" })
    vim.api.nvim_set_hl(0, "RainbowGray6", { fg = "#989898" })
    vim.api.nvim_set_hl(0, "RainbowGray7", { fg = "#a8a8a8" })
    vim.api.nvim_set_hl(0, "RainbowGray8", { fg = "#f8f8f8" })
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
        enabled = true
    },
}

hooks.register(hooks.type.SCOPE_HIGHLIGHT, hooks.builtin.scope_highlight_from_extmark)
