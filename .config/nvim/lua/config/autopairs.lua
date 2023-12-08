local ap = require("nvim-autopairs")

ap.setup({
  disable_filetype = { "TelescopePrompt", "vim" },
  ignored_next_char = "[%w%.]",
  enable_check_bracket_line = false,
  fast_wrap = {},
})
