-- This file can be loaded by calling `lua require('plugins')` from your init.vim

local packer = require('packer')

-- Only required if you have packer configured as `opt`
vim.cmd([[packadd packer.nvim]])

vim.cmd([[
augroup Packer_aug
  autocmd!
  autocmd BufWritePost,FileWritePost packer.lua :so
  autocmd BufWritePost,FileWritePost packer.lua PackerUpdate
augroup end
]])

return packer.startup(function(use)

  use 'wbthomason/packer.nvim' -- Packer can manage itself

  use {  -- telescope fuzzy finder
    'nvim-telescope/telescope.nvim', tag = '0.1.0',
    -- or                            , branch = '0.1.x',
    requires = { {'nvim-lua/plenary.nvim'} }
    -- :checkhealth telescope
  }

  use { -- treesitter
    -- cargo install tree-sitter-cli   # tree-sitter 0.20.7
    'nvim-treesitter/nvim-treesitter',
    run = ':TSUpdate',
    requires = {
      'nvim-treesitter/nvim-treesitter-context',
      'nvim-treesitter/playground'
    }
  }

  use {
    'VonHeikemen/lsp-zero.nvim',
    requires = {
      -- LSP Support
      {'neovim/nvim-lspconfig'},
      {'WhoIsSethDaniel/mason-tool-installer.nvim'},
      {'williamboman/mason-lspconfig.nvim'},
      {'williamboman/mason.nvim'},

      -- Autocompletion
      {'hrsh7th/nvim-cmp'},
      {'hrsh7th/cmp-buffer'},
      {'hrsh7th/cmp-path'},
      {'saadparwaiz1/cmp_luasnip'},
      {'hrsh7th/cmp-nvim-lsp'},
      {'hrsh7th/cmp-nvim-lua'},

      -- Snippets
      {'L3MON4D3/LuaSnip'},
      {'rafamadriz/friendly-snippets'},
    }
  }

  use({
    'jose-elias-alvarez/null-ls.nvim',
    -- config = function()
      -- require('null-ls').setup()null
    -- end,
    requires = { 'nvim-lua/plenary.nvim' },
  })

  use({
    'glepnir/lspsaga.nvim',
    branch = 'main',
    config = function()
      local saga = require('lspsaga')
      saga.init_lsp_saga({
        -- your configuration
      })
    end,
  })

  -- colorschemes
  use { 'ellisonleao/gruvbox.nvim' }

  -- plugins

  use 'folke/which-key.nvim' -- which-key displays popups of possible keybindings
  use 'airblade/vim-gitgutter'
  use 'christoomey/vim-tmux-navigator'
  use 'easymotion/vim-easymotion'
  use 'ThePrimeagen/harpoon' -- Manage quickly accessed files
  use 'godlygeek/tabular'
  use 'haya14busa/incsearch-easymotion.vim'
  -- use 'haya14busa/incsearch-fuzzy.vim'
  -- use 'haya14busa/incsearch.vim' -- TODO, error with / inserting weird chars
  use 'haya14busa/vim-asterisk'
  use 'idbrii/textobj-word-column.vim'
  use 'junegunn/fzf'
  use 'junegunn/fzf.vim'
  use 'junegunn/rainbow_parentheses.vim'
  use 'kana/vim-textobj-fold'
  use 'kana/vim-textobj-function'
  use 'kana/vim-textobj-indent'
  use 'kana/vim-textobj-line'
  use 'kana/vim-textobj-user'
  use 'L3MON4D3/LuaSnip'
  use 'mbbill/undotree'
  use 'romainl/vim-cool'
  use 'saadparwaiz1/cmp_luasnip'
  use 'takac/vim-hardtime'
  use 'tommcdo/vim-exchange'
  use 'tpope/vim-abolish'
  use 'tpope/vim-commentary'
  use 'tpope/vim-endwise'
  use 'tpope/vim-fugitive'
  use 'tpope/vim-ragtag'
  use 'tpope/vim-repeat'
  use 'tpope/vim-sleuth'
  use 'tpope/vim-speeddating'
  use 'tpope/vim-surround'
  use 'tpope/vim-unimpaired'
  use 'tpope/vim-vinegar'
  use 'wellle/targets.vim' -- Add mode text objects

  if packer_bootstrap then
    packer.sync()
  end
end)
