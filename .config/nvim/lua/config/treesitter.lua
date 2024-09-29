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
    -- `false` will disable the whole extension
    enable = true,

    -- Setting this to true will run `:h syntax` and tree-sitter at the same time.
    -- Set this to `true` if you depend on 'syntax' being enabled (like for indentation).
    -- Using this option may slow down your editor, and you may see some duplicate highlights.
    -- Instead of true it can also be a list of languages
    additional_vim_regex_highlighting = false,
  },

  indent = {
    enable = true
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

}

require('nvim-treesitter.install').update({ with_sync = true })
