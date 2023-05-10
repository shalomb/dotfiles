-- This file can be loaded by calling `lua require('plugins')` from your init.vim

local vim = vim

vim.cmd [[packadd packer.nvim]]

local packer = require("packer")

local ensure_packer = function()
  local fn = vim.fn
  local install_path = fn.stdpath("data") .. "/site/pack/packer/start/packer.nvim"
  if fn.empty(fn.glob(install_path)) > 0 then
    fn.system({ "git", "clone", "--depth", "1",
      "https://github.com/wbthomason/packer.nvim", install_path })
    vim.cmd [[packadd packer.nvim]]
    return true
  end
  return false
end
local packer_bootstrap = ensure_packer()

-- Only required if you have packer configured as `opt`
vim.cmd([[packadd packer.nvim]])

-- TODO - Do a PackerUpdate/PackerSync on writeout
-- We can't currently do this as Packer wants to delete the plugins it
-- manages for some reason
-- -- autoload packer on writeout
-- local packer_reload = vim.api.nvim_create_augroup("packer_reload", {clear = true})

-- vim.api.nvim_create_autocmd(
--   { "BufWritePost", "FileWritePost" }, {
--     pattern = '*/lua/config/packer.lua',
--     group = packer_reload,
--     command = ':source <afile>',
--     -- callback = function()
--     --   packer.sync()
--     -- end
-- })

return packer.startup(function(use)
  use "wbthomason/packer.nvim" -- Packer can manage itself

  use {                        -- telescope fuzzy finder
    "nvim-telescope/telescope.nvim", tag = "0.1.0",
    -- or                            , branch = '0.1.x',
    requires = { { "nvim-lua/plenary.nvim" } }
    -- :checkhealth telescope
  }

  use { -- treesitter
    -- cargo install tree-sitter-cli   # tree-sitter 0.20.7
    "nvim-treesitter/nvim-treesitter",
    run = ":TSUpdate",
    requires = {
      "nvim-treesitter/nvim-treesitter-context",
      "nvim-treesitter/playground"
    }
  }

  use {
    "VonHeikemen/lsp-zero.nvim",
    requires = {
      -- LSP Support
      { "neovim/nvim-lspconfig" },
      { "WhoIsSethDaniel/mason-tool-installer.nvim" },
      { "williamboman/mason-lspconfig.nvim" },
      { "williamboman/mason.nvim" },

      -- Autocompletion
      { "hrsh7th/cmp-buffer" },
      { "hrsh7th/cmp-nvim-lsp" },
      { "hrsh7th/cmp-nvim-lua" },
      { "hrsh7th/cmp-path" },
      { "hrsh7th/nvim-cmp" },

      -- Snippets
      { "L3MON4D3/LuaSnip" },
      { "saadparwaiz1/cmp_luasnip" },
      { "rafamadriz/friendly-snippets" },
    }
  }

  use({
    "jose-elias-alvarez/null-ls.nvim",
    -- config = function()
    -- require('null-ls').setup()null
    -- end,
    requires = { "nvim-lua/plenary.nvim" },
  })

  -- use({
  --   "glepnir/lspsaga.nvim",
  --   branch = "main",
  --   config = function()
  --     local saga = require("lspsaga")
  --     saga.init_lsp_saga({
  --       -- your configuration
  --     })
  --   end,
  -- })

  -- colorschemes

  use "ellisonleao/gruvbox.nvim"
  use "mhartington/oceanic-next"
  use "rebelot/kanagawa.nvim"

  -- plugins

  use "L3MON4D3/LuaSnip"
  use "RRethy/nvim-treesitter-textsubjects"
  use "ThePrimeagen/harpoon" -- Manage quickly accessed files
  use "airblade/vim-gitgutter"
  use "christoomey/vim-tmux-navigator"
  use "ellisonleao/glow.nvim"
  use "folke/neodev.nvim"
  use "folke/which-key.nvim" -- which-key displays popups of possible keybindings
  use "ggandor/leap.nvim"
  use "godlygeek/tabular"
  use "haya14busa/vim-asterisk"
  use "ibhagwan/smartyank.nvim"
  use "idbrii/textobj-word-column.vim"
  use "jgdavey/tslime.vim"
  use "jghauser/follow-md-links.nvim"
  use "junegunn/fzf"
  use "junegunn/fzf.vim"
  use "junegunn/rainbow_parentheses.vim"
  use "kana/vim-textobj-fold"
  use "kana/vim-textobj-function"
  use "kana/vim-textobj-indent"
  use "kana/vim-textobj-line"
  use "kana/vim-textobj-user"
  use "majutsushi/tagbar"
  use "mbbill/undotree"
  use "nvim-lualine/lualine.nvim" -- configure Neovim statusline
  use "p00f/nvim-ts-rainbow"
  use "preservim/vim-markdown"
  use "romainl/vim-cool"
  use "takac/vim-hardtime"
  use "tommcdo/vim-exchange"
  use "tpope/vim-abolish"
  use "tpope/vim-commentary"
  use "tpope/vim-endwise"
  use "tpope/vim-fugitive"
  use "tpope/vim-ragtag"
  use "tpope/vim-repeat"
  use "tpope/vim-sleuth"
  use "tpope/vim-speeddating"
  use "tpope/vim-surround"
  use "tpope/vim-unimpaired"
  use "tpope/vim-vinegar"
  use "wellle/targets.vim" -- Add mode text objects
  use 'ThePrimeagen/git-worktree.nvim'

  use { "stevearc/gkeep.nvim", run = ':UpdateRemotePlugins' }

  if packer_bootstrap then
    -- basically used to "pause" and remind me it'll quit
    vim.api.nvim_create_autocmd({ "PackerCompileDone" }, {
      callback = function(_)
        vim.cmd.quitall()
      end
    })
    packer.install()
    packer.compile()
    packer.sync()
  end
end
)
