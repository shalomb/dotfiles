-- lspconfig.tflint.setup({})
-- https://github.com/hashicorp/terraform-ls/blob/main/docs/installation.md#other-platforms

-- https://github.com/hashicorp/terraform-ls/blob/main/docs/USAGE.md#neovim-v080

local lspconfig = require("lspconfig")
local cmp = require("cmp")
local luasnip = require("luasnip")

-- Enable some language servers with the additional completion capabilities offered by nvim-cmp
-- See mti.setup // ensure_installed
local language_servers = {
  "ansiblels",
  -- "awk_ls",
  "bashls",
  -- "cssls",
  "gopls",
  -- "html",
  "jsonls",
  -- "lua_ls",
  "pyright",
  "ruff",
  -- "rust_analyzer",
  -- "sqlls",
  "terraformls",
  "tflint",
  -- "ts_ls", -- is now  ts_ls
  "vimls",
  "yamlls",
}

local cmp_select = { behavior = cmp.SelectBehavior.Select }

----- cmdline completion is broken if we enable this ----

-- -- Use buffer source for `/` and `?` (if you enabled `native_menu`, this won't work anymore).
-- cmp.setup.cmdline({ '/', '?' }, {
--   mapping = cmp.mapping.preset.cmdline(),
--   sources = {
--     { name = 'buffer' }
--   }
-- })

-- -- Use cmdline & path source for ':' (if you enabled `native_menu`, this won't work anymore).
-- cmp.setup.cmdline(':', {
--   mapping = cmp.mapping.preset.cmdline(),
--   sources = cmp.config.sources({
--     { name = 'path' }
--   }, {
--     { name = 'cmdline' }
--   }),
--   matching = { disallow_symbol_nonprefix_matching = false }
-- })

cmp.setup({
  snippet = {
    -- REQUIRED - you must specify a snippet engine
    expand = function(args)
      require('luasnip').lsp_expand(args.body) -- For `luasnip` users.
    end,
  },

  window = {
    completion = cmp.config.window.bordered(),
    documentation = cmp.config.window.bordered(),
  },

  mapping = cmp.mapping.preset.insert({
    ["<C-Space>"] = cmp.mapping.complete(),
    ["<C-p>"] = cmp.mapping.select_prev_item(cmp_select),
    ["<C-n>"] = cmp.mapping.select_next_item(cmp_select),
    ["<C-u>"] = cmp.mapping.scroll_docs(-4),
    ["<C-d>"] = cmp.mapping.scroll_docs(4),
    ["<C-j>"] = cmp.mapping.confirm({ select = true }),
    ["<C-k>"] = cmp.mapping(function(_, _)
      if luasnip.expand_or_jumpable() then
        luasnip.expand_or_jump()
      else
        cmp.mapping.confirm({ select = true })
      end
    end, { "i", "s" }),
  }),

  sources = {
    { name = 'nvim_lsp' },
    { name = 'luasnip' }, -- For luasnip users.
  },
  {
    { name = 'buffer' },
  }
})

-- local capabilities = vim.lsp.protocol.make_client_capabilities()
local capabilities = require('cmp_nvim_lsp').default_capabilities()
-- capabilities.textDocument.completion.completionItem.snippetSupport = true

-- Use an on_attach function to only map the following keys
-- after the language server attaches to the current buffer
local on_attach = function(client, bufnr)
  -- Enable completion triggered by <c-x><c-o>
  vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")
end

for _, lsp_server in ipairs(language_servers) do
  lspconfig[lsp_server].setup({
    flags = { debounce_text_changes = 150 },
    on_attach = on_attach,
    capabilities = capabilities,
    -- filetypes = { "terraform" },
  })
end
