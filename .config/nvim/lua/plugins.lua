return {

  {
    "folke/neoconf.nvim",
    cmd = "Neoconf"
  },

  { -- treesitter
    "nvim-treesitter/nvim-treesitter",
    dependencies = {
      "nvim-treesitter/nvim-treesitter-context",
      "nvim-treesitter/playground",
      "RRethy/nvim-treesitter-textsubjects",
    },
    opts = { ensure_installed = { "terraform", "hcl" } },
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
      "neovim/nvim-lspconfig",
      "WhoIsSethDaniel/mason-tool-installer.nvim",
      "williamboman/mason-lspconfig.nvim",
      "williamboman/mason.nvim",

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

  -- colorschemes
  { "rebelot/kanagawa.nvim",               lazy = true },
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
    "OXY2DEV/markview.nvim",
    lazy = false, -- Recommended
    -- ft = "markdown" -- If you decide to lazy-load anyway

    dependencies = {
      -- You will not need this if you installed the
      -- parsers manually
      -- Or if the parsers are in your $RUNTIMEPATH
      "nvim-treesitter/nvim-treesitter",

      "nvim-tree/nvim-web-devicons",
      "echasnovski/mini.icons",
    }
  },

  { "IndianBoy42/tree-sitter-just",        ft = "justfile" },
  { "ThePrimeagen/git-worktree.nvim",      lazy = false },
  { "ThePrimeagen/harpoon",                lazy = false },                             -- Manage quickly accessed files
  { "lewis6991/gitsigns.nvim",             lazy = true,       event = "BufWinEnter" }, -- Gitgutter replacement
  { "christoomey/vim-tmux-navigator",      lazy = false },
  -- { "ellisonleao/glow.nvim",               cmd = "Glow",      ft = "markdown" },
  { "folke/flash.nvim",                    event = "VeryLazy" },
  { "folke/neodev.nvim",                   lazy = false },
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
  { "p00f/nvim-ts-rainbow",                lazy = false },
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
    "kevinhwang91/nvim-ufo",
    event = "BufRead",
    dependencies = {
      { "kevinhwang91/promise-async" },
      {
        "luukvbaal/statuscol.nvim",
        config = function()
          local builtin = require("statuscol.builtin")
          require("statuscol").setup({
            -- foldfunc = "builtin",
            -- setopt = true,
            relculright = true,
            segments = {
              { text = { builtin.foldfunc },      click = "v:lua.ScFa" },
              { text = { "%s" },                  click = "v:lua.ScSa" },
              { text = { builtin.lnumfunc, " " }, click = "v:lua.ScLa" },
            },
          })
        end,
      },
    },
  }
}
