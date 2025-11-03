-- ./config/ contains the configuration for each plugin.

-- @module plugins
-- @brief This module is used by the `lazy.nvim` plugin manager to load
-- plugins.

return {

  -- {
  --   "OXY2DEV/markview.nvim",
  --   lazy = false, -- Recommended
  --   -- ft = "markdown" -- If you decide to lazy-load anyway
  --
  --   dependencies = {
  --     -- You will not need this if you installed the
  --     -- parsers manually
  --     -- Or if the parsers are in your $RUNTIMEPATH
  --     "nvim-treesitter/nvim-treesitter",
  --
  --     "nvim-tree/nvim-web-devicons",
  --     "echasnovski/mini.icons",
  --   }
  -- },

  {
    "folke/neoconf.nvim",
    cmd = "Neoconf"
  },

  -- colorschemes
  { "rebelot/kanagawa.nvim",    lazy = true },
  { "ellisonleao/gruvbox.nvim", priority = 1000, config = true },

  { -- treesitter
    "nvim-treesitter/nvim-treesitter",
    dependencies = {
      "nvim-treesitter/nvim-treesitter-context",
      "nvim-treesitter/playground",
      "RRethy/nvim-treesitter-textsubjects",
    },
    -- cargo install tree-sitter-cli   # tree-sitter 0.20.7
  },

  {
    "nvimtools/none-ls.nvim",
    -- config = function()
    -- require('null-ls').setup()null
    -- end,
    dependencies = { "nvim-lua/plenary.nvim" },
  },

  {
    "L3MON4D3/LuaSnip",
    -- follow latest release.
    version = "v2.*", -- Replace <CurrentMajor> by the latest released major (first number of latest release)
    -- install jsregexp (optional!).
    build = "make install_jsregexp",
    -- lazy = true,
    -- event = "InsertEnter",
    dependencies = {
      "rafamadriz/friendly-snippets",
      "cstrap/python-snippets"
    }
  },

  {
    'echasnovski/mini.indentscope',
    version = '*',
    lazy = true,
  },

  {
    "mason-org/mason-lspconfig.nvim",
    dependencies = {
      { "mason-org/mason.nvim" },
      "neovim/nvim-lspconfig",
    },
  },

  {
    "hrsh7th/nvim-cmp",
    lazy = true,
    -- load cmp on InsertEnter
    event = "InsertEnter",
    -- these dependencies will only be loaded when cmp loads
    -- dependencies are always lazy-loaded unless specified otherwise
    dependencies = {
      -- Autocompletion
      "hrsh7th/cmp-buffer",
      "hrsh7th/cmp-nvim-lsp",
      "hrsh7th/cmp-nvim-lua",
      "hrsh7th/cmp-path",

      -- LSP Support
      { "neovim/nvim-lspconfig", version = "v0.1.8" }, -- Pin to last version compatible with Neovim 0.10
      "WhoIsSethDaniel/mason-tool-installer.nvim",
      "mason-org/mason-lspconfig.nvim",

      -- Snippets
      "L3MON4D3/LuaSnip",
      "saadparwaiz1/cmp_luasnip",
      "rafamadriz/friendly-snippets",
    },
    config = function()
      -- ...
    end,
  },

  {                                  -- telescope fuzzy finder
    "nvim-telescope/telescope.nvim", -- tag = "0.1.0", or branch = '0.1.x',
    dependencies = { "nvim-lua/plenary.nvim" }
    -- :checkhealth telescope
  },

  {
    'windwp/nvim-autopairs',
    event = "InsertEnter",
  },

  {
    'Wansmer/treesj',
    event = "InsertEnter",
    dependencies = { 'nvim-treesitter/nvim-treesitter' },
  },

  {
    "danymat/neogen",
    event = "InsertEnter",
    dependencies = "nvim-treesitter/nvim-treesitter",
    config = true,
  },

  {
    "kdheepak/lazygit.nvim",
    lazy = true,
    cmd = {
      "LazyGit",
      "LazyGitConfig",
      "LazyGitCurrentFile",
      "LazyGitFilter",
      "LazyGitFilterCurrentFile",
    },
    -- optional for floating window border decoration
    dependencies = {
      "nvim-lua/plenary.nvim",
    },
    -- setting the keybinding for LazyGit with 'keys' is recommended in
    -- order to load the plugin when the command is run for the first time
    keys = {
      { "<leader>lg", "<cmd>LazyGit<cr>", desc = "LazyGit" }
    }
  },

  {
    "utilyre/barbecue.nvim",
    name = "barbecue",
    version = "*",
    dependencies = {
      "SmiteshP/nvim-navic",
      "nvim-tree/nvim-web-devicons", -- optional dependency
    },
    opts = {
      -- configurations go here
    },
  },

  { "IndianBoy42/tree-sitter-just",        ft = "justfile" },
  { "ThePrimeagen/git-worktree.nvim",      lazy = false },
  { "ThePrimeagen/harpoon",                lazy = false },                             -- Manage quickly accessed files
  { "lewis6991/gitsigns.nvim",             lazy = true,       event = "BufWinEnter" }, -- Gitgutter replacement
  { "christoomey/vim-tmux-navigator",      lazy = false },
  -- { "ellisonleao/glow.nvim",               cmd = "Glow",      ft = "markdown" },
  { "folke/flash.nvim",                    event = "VeryLazy" },
  { "folke/lazydev.nvim",                  lazy = false },
  { "folke/which-key.nvim",                lazy = false },
  { "ggandor/flit.nvim",                   lazy = false },
  -- { "ggandor/leap.nvim",                   lazy = false },
  { "godlygeek/tabular",                   lazy = false,      event = "BufWinEnter" },
  { "jgdavey/tslime.vim",                  lazy = false,      event = "BufWinEnter" },
  { "jghauser/follow-md-links.nvim",       ft = "markdown" },
  { "lukas-reineke/indent-blankline.nvim", lazy = false },
  { "majutsushi/tagbar",                   lazy = false },
  { "mbbill/undotree",                     lazy = false },
  { "nvim-lualine/lualine.nvim",           lazy = false }, -- configure Neovim statusline
  -- { "p00f/nvim-ts-rainbow",                lazy = false },
  -- { "preservim/vim-markdown",              ft = "markdown" },
  { "romainl/vim-cool",                    lazy = false },
  {
    "stevearc/oil.nvim",
    lazy = false,
    dependencies = { "nvim-tree/nvim-web-devicons" },
  },
  { "takac/vim-hardtime",    lazy = true, event = "BufWinEnter" },
  { "tommcdo/vim-exchange",  lazy = true, event = "BufWinEnter" },
  { "tpope/vim-abolish",     lazy = true, event = "BufWinEnter" },
  { "tpope/vim-endwise",     lazy = false },
  { "tpope/vim-fugitive",    lazy = false },
  { "tpope/vim-ragtag",      lazy = false },
  { "tpope/vim-repeat",      lazy = false },
  { "tpope/vim-sleuth",      lazy = false },
  { "tpope/vim-speeddating", lazy = false },
  { "tpope/vim-surround",    lazy = false },
  { "tpope/vim-unimpaired",  lazy = false },

  -- { "tpope/vim-commentary",                lazy = true,    event = "BufWinEnter" },
  {
    'numToStr/Comment.nvim',
    opts = {
      -- add any options here
    },
    lazy = false,
  },

  { "kana/vim-textobj-user",          lazy = false, event = "InsertEnter", priority = 1000 },
  { "junegunn/fzf",                   lazy = true,  event = "InsertEnter", },
  { "junegunn/fzf.vim",               lazy = true,  event = "InsertEnter", },
  { "haya14busa/vim-asterisk",        lazy = true,  event = "InsertEnter", },
  { "ibhagwan/smartyank.nvim",        lazy = true,  event = "InsertEnter", },
  { "idbrii/textobj-word-column.vim", lazy = true,  event = "InsertEnter", },
  { "kana/vim-textobj-fold",          lazy = true,  event = "InsertEnter", },
  { "kana/vim-textobj-function",      lazy = true,  event = "InsertEnter", },
  { "kana/vim-textobj-indent",        lazy = true,  event = "InsertEnter", },
  { "kana/vim-textobj-line",          lazy = true,  event = "InsertEnter", },
  { "wellle/targets.vim",             lazy = true,  event = "InsertEnter", }, -- Add mode text objects

  {
    "rcarriga/nvim-dap-ui",
    dependencies = {
      "mfussenegger/nvim-dap",
      "nvim-neotest/nvim-nio",
      "mfussenegger/nvim-dap-python"
    },
  },

  {
    "epwalsh/obsidian.nvim",
    version = "*", -- recommended, use latest release instead of latest commit
    lazy = false,
    ft = "markdown",
    -- event = {
    --   -- If you want to use the home shortcut '~' here you need to call 'vim.fn.expand'.
    --   -- E.g. "BufReadPre " .. vim.fn.expand "~" .. "/my-vault/*.md"
    --   -- refer to `:h file-pattern` for more examples
    --   "BufReadPre " .. vim.fn.expand "~" .. "/obsidian/**/*.md",
    --   "BufNewFile " .. vim.fn.expand "~" .. "tips/**/*",
    -- },
    dependencies = {
      -- Required.
      "nvim-lua/plenary.nvim",
    },
  },

  {
    "ravitemer/mcphub.nvim",
    dependencies = {
      "nvim-lua/plenary.nvim",
    },
    build = "npm install -g mcp-hub@latest", -- Installs `mcp-hub` node binary globally
  },

  -- GitHub Copilot
  {
    "github/copilot.vim",
    lazy = false,
    config = function()
      -- Copilot configuration
      vim.g.copilot_no_tab_map = true
      vim.g.copilot_assume_mapped = true
      vim.g.copilot_tab_fallback = ""
      
      -- Key mappings
      vim.keymap.set("i", "<C-l>", 'copilot#Accept("\\<CR>")', {
        expr = true,
        replace_keycodes = false,
        desc = "Accept Copilot suggestion"
      })
      vim.keymap.set("i", "<C-;>", "<Plug>(copilot-next)", {
        desc = "Next Copilot suggestion"
      })
      vim.keymap.set("i", "<C-,>", "<Plug>(copilot-previous)", {
        desc = "Previous Copilot suggestion"
      })
      vim.keymap.set("i", "<C-\\>", "<Plug>(copilot-dismiss)", {
        desc = "Dismiss Copilot suggestion"
      })
    end,
  },

  -- {
  --   "olimorris/codecompanion.nvim",
  --   opts = {},
  --   dependencies = {
  --     "nvim-lua/plenary.nvim",
  --     "nvim-treesitter/nvim-treesitter",
  --     "ravitemer/mcphub.nvim",
  --     "github/copilot.vim" -- required to setup the github auth
  --   },
  -- },
}
