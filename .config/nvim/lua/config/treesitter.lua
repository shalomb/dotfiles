-- https://github.com/nvim-treesitter/nvim-treesitter
--
-- :TSInstall <ls_to_install>

local treesitter_config = require('nvim-treesitter.configs')

treesitter_config.setup {
  enable = true,

  -- Automatically install missing parsers when entering buffer
  -- Recommendation: set to false if you don't have `tree-sitter` CLI installed locally
  auto_install = true,

  -- Install parsers synchronously (only applied to `ensure_installed`)
  sync_install = true,

  ignore_install = {
    "help",
  },

  -- A list of parser names, or "all"
  ensure_installed = {
    "bash",
    "c",
    "comment",
    "css",
    "dockerfile",
    "dot",
    "git_rebase",
    "gitattributes",
    "gitcommit",
    "gitignore",
    "go",
    "gomod",
    "graphql",
    "hcl",
    "html",
    "http",
    "javascript",
    "jq",
    "json",
    "json5",
    "jsonc",
    "jsonnet",
    "lua",
    "make",
    "markdown",
    "markdown_inline",
    "mermaid",
    "perl",
    "python",
    "regex",
    "rego",
    "rust",
    "sql",
    "terraform",
    "todotxt",
    "toml",
    "vim",
    "yaml",
  },

  highlight = {
    -- We disable it to get around the end_col out of range issue when hitting `J` to join lines
    enable = false,

    -- Setting this to true will run `:h syntax` and tree-sitter at the same time.
    -- Set this to `true` if you depend on 'syntax' being enabled (like for indentation).
    -- Using this option may slow down your editor, and you may see some duplicate highlights.
    -- Instead of true it can also be a list of languages
    additional_vim_regex_highlighting = true,
  },

  -- disabled to prevent Out of bounds issue with 'J'
  indent = {
    enable = false
  },

  rainbow = {
    enable = true,
    -- disable = { "jsx", "cpp" }, list of languages you want to disable the plugin for
    extended_mode = true, -- Also highlight non-bracket delimiters like html tags, boolean or table: lang -> boolean
    max_file_lines = nil, -- Do not enable for files with more than n lines, int
    -- colors = {}, -- table of hex strings
    -- table of hex strings
    colors = {
      "#FF79C6", "#A4FFFF", "#50fa7b", "#FFFFA5", "#FF92DF", "#5e81ac", "#b48ead",
    }
    -- termcolors = {} -- table of colour name strings
  },

  textsubjects = {
    enable = true,
    prev_selection = ',', -- (Optional) keymap to select the previous selection
    keymaps = {
      ['.'] = 'textsubjects-smart',
      [';'] = 'textsubjects-container-outer',
      ['i;'] = 'textsubjects-container-inner',
    },
  },

  -- https://github.com/nvim-treesitter/nvim-treesitter?tab=readme-ov-file#incremental-selection
  incremental_selection = {
    enable = true,
    keymaps = {
      -- '.' to extend selection
      init_selection = "gIn", -- set to `false` to disable one of the mappings

      node_incremental = "gIrn",
      scope_incremental = "gIrc",
      node_decremental = "gIrm",
    },
  },

}

require('nvim-treesitter.install').update({ with_sync = true })

-- vim:ts=2 sw=2
