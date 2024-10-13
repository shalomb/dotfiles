-- config for VonHeikemen/lsp-zero
-- https://github.com/VonHeikemen/lsp-zero.nvim

local vim = vim

local cmp = require("cmp")
local lspconfig = require("lspconfig")

-- local lsz = require("lsp-zero")
local luasnip = require("luasnip")
local util = require("lspconfig").util
local whichkey = require("which-key")


---- lspconfig ----

local lspconfig = require('lspconfig')
local capabilities = require('cmp_nvim_lsp').default_capabilities()

require('mason-lspconfig').setup_handlers({
  function(server_name)
    lspconfig[server_name].setup({
      capabilities = capabilities,
    })
  end,
})

lspconfig.lua_ls.setup({
  -- on_attach = lsp.default_keymaps({buffer = bufnr}),
  capabilities = capabilities,
  flags = { debounce_text_changes = 150 },
  settings = {
    Lua = {
      completion = {
        callSnippet = "Replace"
      },
      diagnostics = {
        globals = { "_", "_G", "vim", }
      },
      workspace = {
        checkThirdParty = false,
      },
    }
  }
})

lspconfig.pyright.setup({
  -- on_attach = on_attach,
  capabilities = capabilities,
  flags = { debounce_text_changes = 150 },
  root_dir = util.root_pattern(".venv", "venv", "pyrightconfig.json"),
  settings = {
    pyright = {
      disableLanguageServices = false,
      disableOrganizeImports = true
    },
    python = {
      analysis = {
        autoSearchPaths = true,
        useLibraryCodeForTypes = true,
        diagnosticMode = "openFilesOnly",
      },
    },
  },
})

lspconfig.rust_analyzer.setup {
  -- Server-specific settings. See `:help lspconfig-setup`
  capabilities = capabilities,
  settings = {
    ['rust-analyzer'] = {},
  },
}

-- lspconfig.gopls.setup({})

-- Global mappings.
-- See `:help vim.diagnostic.*` for documentation on any of the below functions

vim.api.nvim_buf_set_option(0, "omnifunc", "v:lua.vim.lsp.omnifunc")

-- luasnip setup
local luasnip = require 'luasnip'

local cmp_select = { behavior = cmp.SelectBehavior.Select }

cmp.setup {
  enabled = function()
    local buftype = vim.api.nvim_buf_get_option(0, "buftype")
    if buftype == "prompt" then
      return false
    end
    return true
  end,

  formatting = {
    fields = { "menu", "abbr", "kind" },
    format = function(entry, item)
      local menu_icon = {
        buffer = "Ω",
        luasnip = "⋗",
        nvim_lsp = "λ",
        nvim_lua = "[lua]",
        path = "",
      }
      item.menu = menu_icon[entry.source.name]
      return item
    end,
  },

  mapping = cmp.mapping.preset.insert({
    ['<C-p>'] = cmp.mapping.select_prev_item(cmp_select),
    ['<C-n>'] = cmp.mapping.select_next_item(cmp_select),
    ['<C-u>'] = cmp.mapping.scroll_docs(-4), -- Up
    ['<C-d>'] = cmp.mapping.scroll_docs(4),  -- Down

    ["<C-j>"] = cmp.mapping.confirm({ select = true }),
    ["<C-k>"] = cmp.mapping(function(_, _)
      if luasnip.expand_or_jumpable() then
        luasnip.expand_or_jump()
      else
        cmp.mapping.confirm({ select = true })
      end
    end, { "i", "s" }),

    -- C-b (back) C-f (forward) for snippet placeholder navigation.
    ['<C-Space>'] = cmp.mapping.complete(),

    ['<Tab>'] = nil,
    ['<S-Tab>'] = nil,
    ['<CR>'] = nil,
    ['<C-y>'] = nil,
    ['<C-e>'] = nil,

  }),

  preselect = cmp.PreselectMode.None,

  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },

  sources = {
    -- TODO - tmux, ctags, git commits
    { name = "calc",     keyword_length = 3 },
    { name = "emoji",    keyword_length = 3 },
    { name = "luasnip",  keyword_length = 2 },
    { name = "nvim_lsp", keyword_length = 3 },
    { name = "nvim_lua", keyword_length = 3 },
    { name = "path",     keyword_length = 3 },
    {
      name = "buffer",
      keyword_length = 3,
      option = {
        get_bufnrs = function()
          return vim.api.nvim_list_bufs()
        end
      }
    },
  },

  window = {
    completion = cmp.config.window.bordered(),
    documentation = cmp.config.window.bordered(),
  },
}

local on_attach = function(args)
  local bufnr = args.buf
  local client = vim.lsp.get_client_by_id(args.data.client_id)

  -- Enable completion triggered by <c-x><c-o>
  vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

  if client.name == "eslint" then
    vim.cmd.LspStop("eslint")
    return
  end

  -- Buffer local mappings.
  -- See `:help vim.lsp.*` for documentation on any of the below functions

  whichkey.add({
    { "<leader>d",  group = "diagnostics",     mode = { "n" }, },
    { "<leader>df", vim.diagnostic.open_float, desc = "diag float" },
    { "<leader>dl", vim.diagnostic.setloclist, desc = "diags in loclist" },
    { "<leader>dq", vim.diagnostic.setqflist,  desc = "diags in loclist" },
    { "]d",         vim.diagnostic.goto_next,  desc = "diag goto next" },
    { "[d",         vim.diagnostic.goto_prev,  desc = "diag goto prev" },
  })

  whichkey.add({
    { "<leader>", group = "lsp buffer actions", mode = { "n" }, },
    {
      "<leader>=",
      function() vim.lsp.buf.format { async = true } end,
      desc = "format buffer"
    },
    { "gD",       vim.lsp.buf.declaration,      desc = "declaration" },
    { "gd",       vim.lsp.buf.definition,       desc = "definition" },
    { "gd",       vim.lsp.buf.code_action,      desc = "code_action" },
    { "gt",       vim.lsp.buf.type_definition,  desc = "type definition" },
    { "gh",       vim.lsp.buf.signature_help,   desc = "help" },
    { "gi",       vim.lsp.buf.implementation,   desc = "implementation" },
    { "K",        vim.lsp.buf.hover,            desc = "hover" },
    { "gr",       vim.lsp.buf.references,       desc = "references" },
    { "<leader>", group = "lsp actions",        mode = { "n" }, },
    {
      "<leader>lspwf",
      function()
        print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
      end,
      desc = "list wksp folders"
    },
    { "<leader>lspR", vim.lsp.buf.rename,           desc = "rename symbol" },
    { "<leader>lspS", vim.lsp.buf.workspace_symbol, desc = "workspace symbol" },
    {
      "<leader>lspwl",
      function()
        print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
      end,
      desc = "wksp add folder"
    },
    { "<leader>lspwa", vim.lsp.buf.add_workspace_folder,    desc = "wksp add folder" },
    { "<leader>lspwr", vim.lsp.buf.remove_workspace_folder, desc = "wksp remove folder" },
  })
end

-- Use LspAttach autocommand to only map the following keys
-- after the language server attaches to the current buffer
vim.api.nvim_create_autocmd('LspAttach', {
  desc = 'LSP actions',
  group = vim.api.nvim_create_augroup('UserLspConfig', {}),
  callback = on_attach
})

-- Configure `ruff-lsp`.
-- See: https://github.com/neovim/nvim-lspconfig/blob/master/doc/configs.md#ruff_lsp
-- For the default config, along with instructions on how to customize the settings
require('lspconfig').ruff_lsp.setup {
  init_options = {
    settings = {
      -- Any extra CLI arguments for `ruff` go here.
      args = {},
    }
  }
}

-- -- debugging
-- -- vim.lsp.set_log_level("debug")
-- -- :LspLog
-- -- :LsPInfo -- diags
-- -- :LspInstall -- Choose a LS for the current FT
