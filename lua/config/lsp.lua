-- config for VonHeikemen/lsp-zero
-- https://github.com/VonHeikemen/lsp-zero.nvim

local vim = vim

local lsp = require("lsp-zero")
local lspconfig = require("lspconfig")
local util = require('lspconfig').util

vim.opt.completeopt = { "menu", "menuone", "noselect" }

lsp.preset("recommended")

-- language servers
lsp.ensure_installed({
  "awk_ls",
  "bashls",
  "cssls",
  "gopls",
  "html",
  "pyright",
  "rust_analyzer",
  "sqls",
  "sumneko_lua",
  "tsserver",
  "vimls",
  "yamlls",
})

-- Get around bug in the mapcheck at
-- https://github.com/VonHeikemen/lsp-zero.nvim/blob/main/lua/lsp-zero/server.lua#L75
vim.keymap.set('n', '<c-k>', ':TmuxNavigateUp<cr>')

local cmp = require("cmp")
local cmp_select = { behavior = cmp.SelectBehavior.Select }
local cmp_mappings = lsp.defaults.cmp_mappings({
  ["<C-Space>"] = cmp.mapping.complete(),
  ["<C-p>"] = cmp.mapping.select_prev_item(cmp_select),
  ["<C-n>"] = cmp.mapping.select_next_item(cmp_select),

  ['<C-u>'] = cmp.mapping.scroll_docs(-4),
  ['<C-d>'] = cmp.mapping.scroll_docs(4),

  ["<C-j>"] = cmp.mapping.confirm({
    select = true,
  }),
})

-- disable completion with tab
-- this helps with copilot setup
cmp_mappings["<Tab>"] = nil
cmp_mappings["<S-Tab>"] = nil
cmp_mappings["<CR>"] = nil

lsp.setup_nvim_cmp({
  snippet = {
    expand = function(args)
      require('luasnip').lsp_expand(args.body)
    end,
  },
  mapping = cmp_mappings,
  sources = {
    {name = 'path'},
    {name = 'nvim_lsp', keyword_length = 3},
    -- {name = 'buffer', keyword_length = 3},
    -- {name = 'luasnip', keyword_length = 2},
  },
  window = {
    completion = cmp.config.window.bordered(),
    documentation = cmp.config.window.bordered(),
  },
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
})

-- Set configuration for specific filetype.
cmp.setup.filetype('gitcommit', {
  sources = cmp.config.sources({
    { name = 'cmp_git' }, -- You can specify the `cmp_git` source if you were installed it.
  }, {
    { name = 'buffer' },
  })
})

-- Use buffer source for `/` and `?` (if you enabled `native_menu`, this won't work anymore).
cmp.setup.cmdline({ '/', '?' }, {
  sources = {
    { name = 'buffer' }
  }
})

-- -- Use cmdline & path source for ':' (if you enabled `native_menu`, this won't work anymore).
-- cmp.setup.cmdline(':', {
--   sources = cmp.config.sources({
--     { name = 'path' }
--   }, {
--     { name = 'cmdline' }
--   })
-- })

-- -- setup cmdline completion to keep order reversed
-- cmp.setup.cmdline({ ':', '/', '?' }, {
--   mapping = cmp.mapping.preset.cmdline(),
--   view = {
--     entries = {name = 'custom', selection_order = 'near_cursor' }
--   },
-- })

lsp.set_preferences({
  suggest_lsp_servers = true,
  sign_icons = {
    error = "E",
    warn = "W",
    hint = "H",
    info = "I"
  }
})

local on_attach = function(client, bufnr)
  -- Enable completion triggered by <c-x><c-o>
  vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

  local opts = { buffer = bufnr, remap = false, noremap=true, silent=true }

  if client.name == "eslint" then
    vim.cmd.LspStop("eslint")
    return
  end

  -- vim.keymap.set("n", "<leader>D", ':lua vim.diagnostic.setqflist()<cr>') -- TODO This doesnt' appear to work
  vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
  vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
  vim.keymap.set("n", "<leader>vws", vim.lsp.buf.workspace_symbol, opts)
  vim.keymap.set("n", "<leader>vd", vim.diagnostic.open_float, opts)
  vim.keymap.set("n", "]d", vim.diagnostic.goto_next, opts)
  vim.keymap.set("n", "[d", vim.diagnostic.goto_prev, opts)
  vim.keymap.set("n", "<leader>vca", vim.lsp.buf.code_action, opts)
  vim.keymap.set("n", "<leader>vrr", vim.lsp.buf.references, opts)
  vim.keymap.set("n", "<leader>vrn", vim.lsp.buf.rename, opts)
  vim.keymap.set("i", "<C-h>", vim.lsp.buf.signature_help, opts)
  vim.keymap.set("i", "<C-h>", vim.lsp.buf.signature_help, opts)
  vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
  vim.keymap.set("n", "<space>D", vim.lsp.buf.type_definition, opts)
  vim.keymap.set("n", "<space>f", function() vim.lsp.buf.format { async = true } end, opts)
  vim.keymap.set("n", "<space>wl", function()
    print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
  end, opts)
  vim.keymap.set("n", "<space>wa", vim.lsp.buf.add_workspace_folder, opts)
  vim.keymap.set("n", "<space>wr", vim.lsp.buf.remove_workspace_folder, opts)
end

lsp.on_attach(on_attach)
lsp.setup()

vim.diagnostic.config({
  virtual_text = true,
  signs = true,
  update_in_insert = false,
  underline = true,
  severity_sort = false,
  float = true,
})

lspconfig.pyright.setup({
  on_attach = on_attach,
  flags = { debounce_text_changes = 150 },
  root_dir = util.root_pattern('.venv', 'venv', 'pyrightconfig.json'),
  settings = {
    pyright = { disableLanguageServices = false, disableOrganizeImports = true },
    python = {
      analysis = {
        autoSearchPaths = true;
        useLibraryCodeForTypes = true,
        diagnosticMode = 'openFilesOnly',
      },
    },
  },
})

-- debugging
-- vim.lsp.set_log_level("debug")
-- :LspLog
-- :LsPInfo -- diags
-- :LspInstall -- Choose a LS for the current FT
