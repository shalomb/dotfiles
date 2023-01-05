-- lua
-- debugging and diagnostics

local vim = vim

vim.lsp.handlers['textDocument/hover'] = vim.lsp.with(
  vim.lsp.handlers.hover,
  { border = 'rounded' }
)

vim.lsp.handlers['textDocument/signatureHelp'] = vim.lsp.with(
  vim.lsp.handlers.signature_help,
  { border = 'rounded' }
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

sign({ name = 'DiagnosticSignError', text = '✘' })
sign({ name = 'DiagnosticSignWarn', text = '▲' })
sign({ name = 'DiagnosticSignHint', text = '⚑' })
sign({ name = 'DiagnosticSignInfo', text = '' })

local luasnip = require("luasnip")
local augroup = vim.api.nvim_create_augroup("luasnip-expand", { clear = true })
local autocmd = vim.api.nvim_create_autocmd

-- disable diagnostics in insert mode
-- https://www.reddit.com/r/neovim/comments/uf35lo/comment/i6s4ai9/

autocmd('ModeChanged', {
  group = augroup,
  pattern = { 'n:i', 'n:v', 'i:v' },
  callback = function() vim.diagnostic.disable() end,
})

autocmd('ModeChanged', {
  group = augroup,
  pattern = 'i:n',
  callback = function() vim.diagnostic.enable() end,
})

-- autocmd({ 'CursorHold' }, {
--   desc = 'Show box with diagnostics for current line',
--   pattern = '*',
--   callback = function()
--     vim.diagnostic.open_float({ focusable = false })
--   end,
--   group = augroup,
-- })

-- -- disable diagnostics in snippet expansion
-- -- https://www.reddit.com/r/neovim/comments/ug2s4s/disable_diagnostic_while_expanding_luasnip/
-- autocmd("ModeChanged", {
--   group    = augroup,
--   pattern  = "*:s",
--   callback = function()
--     if luasnip.in_snippet() then
--       return vim.diagnostic.disable()
--     end
--   end
-- })

-- autocmd("ModeChanged", {
--   group    = augroup,
--   pattern  = "[is]:n",
--   callback = function()
--     if luasnip.in_snippet() then
--       return vim.diagnostic.enable()
--     end
--   end
-- })
