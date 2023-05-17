-- hashicorp/terraform-ls
-- https://github.com/hashicorp/terraform-ls/blob/main/docs/installation.md#other-platforms

-- https://github.com/hashicorp/terraform-ls/blob/main/docs/USAGE.md#neovim-v080

local lspconfig = require("lspconfig")
local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.completion.completionItem.snippetSupport = true

lspconfig.terraformls.setup {
  flags = { debounce_text_changes = 150 },
  capabilities = capabilities
}
