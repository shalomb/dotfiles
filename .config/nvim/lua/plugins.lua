-- ./config/ contains the configuration for each plugin.

-- @module plugins
-- @brief This module is used by the `lazy.nvim` plugin manager to load
-- plugins.

return {

  -- colorschemes
  { "ellisonleao/gruvbox.nvim", priority = 1000, config = true },

  { -- treesitter
    -- Migrated to the `main` branch: `master` is archived upstream and
    -- incompatible with NeoVim 0.12's Treesitter core (E: attempt to call
    -- method 'range' (a nil value)). `main` is a full rewrite: no more
    -- `nvim-treesitter.configs`, `rainbow`, or `incremental_selection` --
    -- highlighting/indent/folds now come from NeoVim core APIs, see
    -- lua/config/treesitter.lua.
    --
    -- `nvim-treesitter-textsubjects` was dropped: it hard-imports the
    -- removed legacy modules `nvim-treesitter.query` / `.ts_utils`, which
    -- do not exist on `main` and are unmaintained upstream for it.
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    lazy = false,
    build = ":TSUpdate",
    dependencies = {
      "nvim-treesitter/nvim-treesitter-context",
    },
    -- Requires: tree-sitter-cli (>=0.26.1, installed via package manager, not npm), a C compiler.
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
      "WhoIsSethDaniel/mason-tool-installer.nvim",
      "mason-org/mason-lspconfig.nvim",

      -- Snippets
      "L3MON4D3/LuaSnip",
      "saadparwaiz1/cmp_luasnip",
      "rafamadriz/friendly-snippets",
    },
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

  { "ThePrimeagen/git-worktree.nvim",      lazy = false },
  { "ThePrimeagen/harpoon",                lazy = false },                             -- Manage quickly accessed files
  { "lewis6991/gitsigns.nvim",             lazy = true,       event = "BufWinEnter" }, -- Gitgutter replacement
  { "christoomey/vim-tmux-navigator",      lazy = false },
  { "folke/flash.nvim",                    event = "VeryLazy" },
  { "folke/lazydev.nvim",                  lazy = false },
  { "folke/which-key.nvim",                lazy = false },
  { "godlygeek/tabular",                   lazy = false },
  { "jgdavey/tslime.vim",                  lazy = false },
  { "lukas-reineke/indent-blankline.nvim", lazy = false },
  { "mbbill/undotree",                     lazy = false },
  { "nvim-lualine/lualine.nvim",           lazy = false }, -- configure Neovim statusline
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
  { "tpope/vim-repeat",      lazy = false },
  { "tpope/vim-sleuth",      lazy = false },
  { "tpope/vim-surround",    lazy = false },
  { "tpope/vim-unimpaired",  lazy = false },

  {
    'numToStr/Comment.nvim',
    opts = {
      -- add any options here
    },
    lazy = false,
  },

  { "kana/vim-textobj-user",          lazy = false, event = "InsertEnter", priority = 1000 },
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

  { -- In-buffer markdown rendering (headings, tables, code, links, checkboxes)
    "MeanderingProgrammer/render-markdown.nvim",
    ft = { "markdown" },
    dependencies = { "nvim-treesitter/nvim-treesitter", "nvim-tree/nvim-web-devicons" },
    opts = {},
  },

  { -- Inline diagrams in markdown (mermaid fences -> PNG -> kitty protocol).
    -- Needs: mmdc (npm-tools), ImageMagick (`apt install imagemagick`), and a
    -- kitty-protocol terminal (WezTerm).
    -- OPT-IN (`vim.g.mermaid_inline = true`): inside tmux, passthrough images
    -- misplace, flicker and leave artefacts (tested: tmux 3.8 + WezTerm over
    -- SSH). Works best in a bare WezTerm tab without tmux.
    "3rd/diagram.nvim",
    ft = { "markdown" },
    cond = function()
      return vim.g.mermaid_inline == true
        and (vim.fn.executable("magick") == 1 or vim.fn.executable("convert") == 1)
    end,
    dependencies = {
      {
        "3rd/image.nvim",
        opts = {
          backend = "kitty",
          processor = "magick_cli",
          integrations = { markdown = { enabled = true } },
          max_height_window_percentage = 25,
          max_width_window_percentage = 70,
          tmux_show_only_in_active_window = true,
        },
      },
    },
    opts = function()
      return {
        integrations = { require("diagram.integrations.markdown") },
        renderer_options = {
          mermaid = { cli_args = require("config.diagrams").puppeteer_args(), scale = 1 },
        },
      }
    end,
  },

  { -- Mermaid diagrams: preview, format, lint (lint/render need `mmdc`)
    -- Parser is installed via lua/config/treesitter.lua (ensure_installed).
    "kevalin/mermaid.nvim",
    ft = "mermaid",
    cmd = { "MermaidPreview", "MermaidPreviewStop", "MermaidFormat", "MermaidRender", "MermaidCopyURL" },
    dependencies = { "nvim-treesitter/nvim-treesitter" },
    -- Fixed port (VM tunnel); keep in sync with config.mermaid_block.configured_port
    opts = { preview = { port = vim.g.mermaid_port or 8765 } },
    config = function(_, opts)
      require("mermaid").setup(opts)
      vim.api.nvim_create_autocmd("FileType", {
        pattern = "mermaid",
        callback = function(ev)
          local maps = {
            p = { "MermaidPreview", "Mermaid Preview" },
            f = { "MermaidFormat", "Mermaid Format" },
            r = { "MermaidRender", "Mermaid Render" },
            c = { "MermaidCopyURL", "Mermaid Copy URL" },
            x = { "MermaidPreviewStop", "Mermaid Stop Preview" },
          }
          for k, v in pairs(maps) do
            vim.keymap.set("n", "<leader>m" .. k, "<Cmd>" .. v[1] .. "<CR>",
              { buffer = ev.buf, desc = v[2] })
          end
        end,
      })
    end,
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

}
