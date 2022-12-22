-- diagnostics config

local vim = vim

vim.lsp.handlers['textDocument/hover'] = vim.lsp.with(
  vim.lsp.handlers.hover,
  {border = 'rounded'}
)

vim.lsp.handlers['textDocument/signatureHelp'] = vim.lsp.with(
  vim.lsp.handlers.signature_help,
  {border = 'rounded'}
)

vim.diagnostic.config({
  virtual_text = true,
  signs = true,
  severity_sort = true,
  underline = true,
  update_in_insert = false,
  float = {
    show_header = false,
    header = 'Diag',
    prefix = '> ',
    source = 'always',
    border = "double",
    format = function(diagnostic)
      return string.format(
        "%s\n%s: %s -> %s",
        diagnostic.message,
        diagnostic.source,
        diagnostic.code,
        vim.api.nvim_buf_get_option(0, "filetype")
      )
    end,
  },
})

local signs = {
  Error = "E ",
  Warning = "W ",
  Hint = "H",
  Information = "I "
}

for type, icon in pairs(signs) do
  local hl = "LspDiagnosticsSign" .. type
  vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = "" })
end

local sign = function(opts)
  vim.fn.sign_define(opts.name, {
    texthl = opts.name,
    text = opts.text,
    numhl = ''
  })
end

sign({name = 'DiagnosticSignError', text = '✘'})
sign({name = 'DiagnosticSignWarn', text = '▲'})
sign({name = 'DiagnosticSignHint', text = '⚑'})
sign({name = 'DiagnosticSignInfo', text = ''})
