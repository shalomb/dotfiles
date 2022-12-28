-- hashicorp/terraform-ls
-- https://github.com/hashicorp/terraform-ls/blob/main/docs/installation.md#other-platforms

local lspconfig = require("lspconfig")
local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.completion.completionItem.snippetSupport = true

lspconfig.terraformls.setup {
  flags = { debounce_text_changes = 150 },
  capabilities = capabilities
}

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
