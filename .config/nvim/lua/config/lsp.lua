-- LSP configuration for Neovim 0.11+
-- Uses vim.lsp.config() + vim.lsp.enable() (native API, no lspconfig.setup() needed)
-- See: https://neovim.io/doc/user/lsp.html

local cmp     = require("cmp")
local luasnip = require("luasnip")
local whichkey = require("which-key")

-- ── Capabilities ─────────────────────────────────────────────────────────────

local capabilities = require('cmp_nvim_lsp').default_capabilities()
capabilities.offsetEncoding = { 'utf-16' }  -- resolves pyright/ruff encoding mismatch

-- ── Server list ───────────────────────────────────────────────────────────────
-- Must match mason.lua ensure_installed names

local language_servers = {
  "ansiblels",
  "bashls",
  "gopls",
  "jsonls",
  "lua_ls",
  "pyright",
  "ruff",
  "rust_analyzer",
  "terraformls",
  "tflint",
  "vimls",
  "yamlls",
}

-- ── Per-server configuration ──────────────────────────────────────────────────

vim.lsp.config('lua_ls', {
  capabilities = capabilities,
  flags = { debounce_text_changes = 150 },
  settings = {
    Lua = {
      completion  = { callSnippet = "Replace" },
      diagnostics = { globals = { "_", "_G", "vim" } },
      workspace   = { checkThirdParty = false },
    }
  }
})

vim.lsp.config('pyright', {
  capabilities = capabilities,
  flags = { debounce_text_changes = 150 },
  root_dir = function(bufnr, cb)
    local fname = vim.api.nvim_buf_get_name(bufnr)
    cb(vim.fs.dirname(vim.fs.find(
      { ".venv", "venv", "pyrightconfig.json", "pyproject.toml", "setup.py" },
      { path = fname, upward = true }
    )[1]))
  end,
  settings = {
    pyright = {
      disableLanguageServices = false,
      disableOrganizeImports  = true,
    },
    python = {
      analysis = {
        autoSearchPaths    = true,
        useLibraryCodeForTypes = true,
        diagnosticMode     = "openFilesOnly",
      },
    },
  },
})

vim.lsp.config('ruff', {
  capabilities = capabilities,
  init_options = {
    settings = { args = {} },
  },
})

vim.lsp.config('rust_analyzer', {
  capabilities = capabilities,
  settings = { ['rust-analyzer'] = {} },
})

-- Servers with explicit config above; apply shared defaults to the rest
local configured = { lua_ls = true, pyright = true, ruff = true, rust_analyzer = true }
for _, lsp_server in ipairs(language_servers) do
  if not configured[lsp_server] then
    vim.lsp.config(lsp_server, {
      flags        = { debounce_text_changes = 150 },
      capabilities = capabilities,
    })
  end
end

vim.lsp.enable(language_servers)

-- ── Completion (nvim-cmp) ─────────────────────────────────────────────────────

local cmp_select = { behavior = cmp.SelectBehavior.Select }

cmp.setup {
  enabled = function()
    return vim.api.nvim_get_option_value("buftype", { buf = 0 }) ~= "prompt"
  end,

  formatting = {
    fields = { "menu", "abbr", "kind" },
    format = function(entry, item)
      local icons = {
        buffer   = "Ω",
        luasnip  = "⋗",
        nvim_lsp = "λ",
        nvim_lua = "[lua]",
        path     = "",
      }
      item.menu = icons[entry.source.name]
      return item
    end,
  },

  mapping = cmp.mapping.preset.insert({
    ['<C-p>']     = cmp.mapping.select_prev_item(cmp_select),
    ['<C-n>']     = cmp.mapping.select_next_item(cmp_select),
    ['<C-u>']     = cmp.mapping.scroll_docs(-4),
    ['<C-d>']     = cmp.mapping.scroll_docs(4),
    ['<C-Space>'] = cmp.mapping.complete(),
    ['<C-j>']     = cmp.mapping.confirm({ select = true }),
    ['<C-k>']     = cmp.mapping(function(_, _)
      if luasnip.expand_or_jumpable() then
        luasnip.expand_or_jump()
      else
        cmp.mapping.confirm({ select = true })
      end
    end, { "i", "s" }),
    ['<Tab>']   = nil,
    ['<S-Tab>'] = nil,
    ['<CR>']    = nil,
    ['<C-y>']   = nil,
    ['<C-e>']   = nil,
  }),

  preselect = cmp.PreselectMode.None,

  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },

  sources = {
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
        get_bufnrs = function() return vim.api.nvim_list_bufs() end
      }
    },
  },

  window = {
    completion    = cmp.config.window.bordered(),
    documentation = cmp.config.window.bordered(),
  },
}

-- ── On-attach keymaps ─────────────────────────────────────────────────────────

local on_attach = function(args)
  local bufnr = args.buf
  local client = vim.lsp.get_client_by_id(args.data.client_id)

  vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

  if client.name == "eslint" then
    vim.cmd.LspStop("eslint")
    return
  end

  whichkey.add({
    { "<leader>d",  group = "diagnostics",     mode = { "n" } },
    { "<leader>df", vim.diagnostic.open_float, desc = "diag float" },
    { "<leader>dl", vim.diagnostic.setloclist, desc = "diags in loclist" },
    { "<leader>dq", vim.diagnostic.setqflist,  desc = "diags in qflist" },
    { "]d",         vim.diagnostic.goto_next,  desc = "diag goto next" },
    { "[d",         vim.diagnostic.goto_prev,  desc = "diag goto prev" },
  })

  whichkey.add({
    { "<leader>", group = "lsp buffer actions", mode = { "n" } },
    {
      "<leader>=",
      function()
        if not _G.is_exempt_from_formatting then
          vim.lsp.buf.format { async = true }
        end
      end,
      desc = "format buffer"
    },
    { "gD",  vim.lsp.buf.declaration,     desc = "declaration" },
    { "gd",  vim.lsp.buf.definition,      desc = "definition" },
    { "gC",  vim.lsp.buf.code_action,     desc = "code action" },
    { "gt",  vim.lsp.buf.type_definition, desc = "type definition" },
    { "gh",  vim.lsp.buf.signature_help,  desc = "signature help" },
    { "gi",  vim.lsp.buf.implementation,  desc = "implementation" },
    { "K",   vim.lsp.buf.hover,           desc = "hover" },
    { "gr",  vim.lsp.buf.references,      desc = "references" },
    { "<leader>", group = "lsp actions",  mode = { "n" } },
    { "<leader>lspR",  vim.lsp.buf.rename,           desc = "rename symbol" },
    { "<leader>lspS",  vim.lsp.buf.workspace_symbol, desc = "workspace symbol" },
    { "<leader>lspwa", vim.lsp.buf.add_workspace_folder,    desc = "wksp add folder" },
    { "<leader>lspwr", vim.lsp.buf.remove_workspace_folder, desc = "wksp remove folder" },
    {
      "<leader>lspwl",
      function() print(vim.inspect(vim.lsp.buf.list_workspace_folders())) end,
      desc = "list wksp folders"
    },
  })
end

vim.api.nvim_create_autocmd('LspAttach', {
  desc     = 'LSP actions',
  group    = vim.api.nvim_create_augroup('UserLspConfig', {}),
  callback = on_attach,
})

-- vim:ts=2 sw=2
