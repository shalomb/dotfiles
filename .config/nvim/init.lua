-- lua

local vim = vim

vim.g.python3_host_skip_check = true
vim.g.python3_host_prog = '/usr/bin/python3'

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({

  { "folke/neoconf.nvim", cmd = "Neoconf" },

  { -- treesitter
    "nvim-treesitter/nvim-treesitter",
    dependencies = {
      "nvim-treesitter/nvim-treesitter-context",
      "nvim-treesitter/playground"
    }
    -- cargo install tree-sitter-cli   # tree-sitter 0.20.7
  },

  {
    "VonHeikemen/lsp-zero.nvim",
    event = { 'BufReadPre', 'BufNewFile' },
    cmd = 'Mason',
    dependencies = {
      -- LSP Support
      "neovim/nvim-lspconfig" ,
      "WhoIsSethDaniel/mason-tool-installer.nvim" ,
      "williamboman/mason-lspconfig.nvim" ,
      "williamboman/mason.nvim" ,

      -- Autocompletion
      "hrsh7th/cmp-buffer" ,
      "hrsh7th/cmp-nvim-lsp" ,
      "hrsh7th/cmp-nvim-lua" ,
      "hrsh7th/cmp-path" ,
      "hrsh7th/nvim-cmp" ,

      -- Snippets
      "L3MON4D3/LuaSnip" ,
      "saadparwaiz1/cmp_luasnip" ,
      "rafamadriz/friendly-snippets" ,
    }
  },

  {
    "jose-elias-alvarez/null-ls.nvim",
    -- config = function()
    -- require('null-ls').setup()null
    -- end,
    dependencies = { "nvim-lua/plenary.nvim" },
  },

  {
    "hrsh7th/nvim-cmp",
    -- load cmp on InsertEnter
    event = "InsertEnter",
    -- these dependencies will only be loaded when cmp loads
    -- dependencies are always lazy-loaded unless specified otherwise
    dependencies = {
      "hrsh7th/cmp-nvim-lsp",
      "hrsh7th/cmp-buffer",
    },
    config = function()
      -- ...
    end,
  },

  {                              -- telescope fuzzy finder
    "nvim-telescope/telescope.nvim", -- tag = "0.1.0", or branch = '0.1.x',
    dependencies = { "nvim-lua/plenary.nvim" }
    -- :checkhealth telescope
  },

  { "IndianBoy42/tree-sitter-just", lazy = false },
  { "L3MON4D3/LuaSnip", lazy = false },
  { "RRethy/nvim-treesitter-textsubjects", lazy = false },
  { "ThePrimeagen/git-worktree.nvim", lazy = false },
  { "ThePrimeagen/harpoon", lazy = false },-- Manage quickly accessed files
  { "airblade/vim-gitgutter", lazy = false },
  { "christoomey/vim-tmux-navigator", lazy = false },
  { "ellisonleao/glow.nvim", lazy = false },
  { "folke/flash.nvim", lazy = false },
  { "folke/neodev.nvim", lazy = false },
  { "folke/which-key.nvim", lazy = false },
  { "ggandor/flit.nvim", lazy = false },
  { "ggandor/leap.nvim", lazy = false },
  { "godlygeek/tabular", lazy = false },
  { "haya14busa/vim-asterisk", lazy = false },
  { "ibhagwan/smartyank.nvim", lazy = false },
  { "idbrii/textobj-word-column.vim", lazy = false },
  { "jgdavey/tslime.vim", lazy = false },
  { "jghauser/follow-md-links.nvim", lazy = false },
  { "junegunn/fzf", lazy = false },
  { "junegunn/fzf.vim", lazy = false },
  { "junegunn/rainbow_parentheses.vim", lazy = false },
  { "kana/vim-textobj-fold", lazy = false },
  { "kana/vim-textobj-function", lazy = false },
  { "kana/vim-textobj-indent", lazy = false },
  { "kana/vim-textobj-line", lazy = false },
  { "kana/vim-textobj-user", lazy = false, priority = 500 },
  { "lukas-reineke/indent-blankline.nvim", lazy = false },
  { "majutsushi/tagbar", lazy = false },
  { "mbbill/undotree", lazy = false },
  { "nvim-lualine/lualine.nvim", lazy = false },-- configure Neovim statusline
  { "p00f/nvim-ts-rainbow", lazy = false },
  { "preservim/vim-markdown", lazy = false },
  { "rebelot/kanagawa.nvim", lazy = false },
  { "romainl/vim-cool", lazy = false },
  { "stevearc/oil.nvim", lazy = false },
  { "takac/vim-hardtime", lazy = false },
  { "tommcdo/vim-exchange", lazy = false },
  { "tpope/vim-abolish", lazy = false },
  { "tpope/vim-commentary", lazy = false },
  { "tpope/vim-endwise", lazy = false },
  { "tpope/vim-fugitive", lazy = false },
  { "tpope/vim-ragtag", lazy = false },
  { "tpope/vim-repeat", lazy = false },
  { "tpope/vim-sleuth", lazy = false },
  { "tpope/vim-speeddating", lazy = false },
  { "tpope/vim-surround", lazy = false },
  { "tpope/vim-unimpaired", lazy = false },
  { "wellle/targets.vim", lazy = false },-- Add mode text objects

})

-- Load config
require("config")
