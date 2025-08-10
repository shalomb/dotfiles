-- lua

-- You can override the default detection using the override function
-- EXAMPLE: If you want a certain directory to be configured differently, you can override its settings
require("lazydev").setup({
  library = {        { path = "${3rd}/luv/library", words = { "vim%.uv" } },
},
})
