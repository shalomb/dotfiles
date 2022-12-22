-- hashicorp/terraform-ls
-- https://github.com/hashicorp/terraform-ls/blob/main/docs/installation.md#other-platforms

local lspconfig = require("lspconfig")

lspconfig.terraformls.setup {}

-- vim.api.nvim_create_autocmd({ "BufWritePre" }, {
--   pattern = { "*.tf", "*.tfvars" },
--   callback = vim.lsp.buf.format(),
-- })

-- lspconfig.luacheck.setup({
--   settings = {
--     Lua = {
--       diagnostics = {
--         globals = {"vim"},
--       },
--     },
--   },
-- })

lspconfig.sumneko_lua.setup({
  settings = {
    Lua = {
      diagnostics = {
        globals = {"vim"},
      },
    },
  },
})
