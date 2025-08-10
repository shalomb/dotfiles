local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

-- Set formatprg on load and when textwidth changes
local function update_format_prg()
  local buf = vim.api.nvim_win_get_buf(0)
  local textwidth = vim.bo.textwidth or 79
  if vim.api.nvim_buf_get_option(buf, 'buftype') == "" then
    vim.bo.formatprg = (vim.bo.formatprg or vim.o.formatprg):gsub('%d+', textwidth)
  end
end

local formatprg_group = augroup("formatprg_set", { clear = true })
autocmd({ "VimEnter", "BufEnter" }, {
  group = formatprg_group,
  pattern = "*",
  callback = update_format_prg,
})
autocmd("OptionSet", {
  group = formatprg_group,
  pattern = "textwidth",
  callback = update_format_prg,
})

-- LSP autoformat on save
local function is_exempt_from_formatting(ft, client)
  local excluded_filetypes = { 'sh', 'md', 'markdown', 'text' }
  for _, v in ipairs(excluded_filetypes) do
    if ft:find(v) then
      vim.b.is_exempt_from_formatting = true
      return true
    end
  end
  local excluded_clients = { 'bashls', 'tsserver' }
  for _, v in ipairs(excluded_clients) do
    if client.name:find(v) then
      return true
    end
  end
  return false
end

local lsp_fmt_augroup = augroup("LspFormatting", { clear = false })
autocmd('LspAttach', {
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    if not client then return end
    local is_exempt = is_exempt_from_formatting(vim.bo.filetype, client)
    if client.supports_method and client:supports_method('textDocument/formatting') then
      vim.api.nvim_clear_autocmds({ group = lsp_fmt_augroup, buffer = args.buf })
      autocmd('BufWritePre', {
        group = lsp_fmt_augroup,
        buffer = args.buf,
        callback = function()
          if not is_exempt then
            vim.lsp.buf.format({ bufnr = args.buf, id = client.id, async = false })
          end
        end,
      })
    end
  end
})
