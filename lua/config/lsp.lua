-- config for VonHeikemen/lsp-zero
-- https://github.com/VonHeikemen/lsp-zero.nvim

local vim = vim

local cmp = require("cmp")
local lspconfig = require("lspconfig")
local lsp = require("lsp-zero")
local luasnip = require("luasnip")
local util = require("lspconfig").util
local whichkey = require("which-key")

vim.opt.completeopt = { "menu", "menuone", "noselect" }

lsp.preset("recommended")

lsp.set_preferences({
  suggest_lsp_servers = true,
  setup_servers_on_start = true,
  set_lsp_keymaps = false,
  configure_diagnostics = true,
  cmp_capabilities = true,
  manage_nvim_cmp = true,
  call_servers = "local",
  sign_icons = {
    error = "✘",
    warn = "▲",
    hint = "⚑",
    info = ""
  }
})

-- language servers
local language_servers = {
  "ansiblels",
  "bashls",
  "cssls",
  "awk_ls",
  "gopls",
  "html",
  "jsonls",
  "pyright",
  "rust_analyzer",
  "sqls",
  "sumneko_lua",
  "terraformls",
  "tflint",
  "tsserver",
  "vimls",
  "yamlls",
}
lsp.ensure_installed(language_servers)

local cmp_select = { behavior = cmp.SelectBehavior.Select }
local cmp_mappings = lsp.defaults.cmp_mappings({
  ["<c-Space>"] = cmp.mapping.complete(),
  ["<c-p>"] = cmp.mapping.select_prev_item(cmp_select),
  ["<c-n>"] = cmp.mapping.select_next_item(cmp_select),

  ["<c-u>"] = cmp.mapping.scroll_docs(-4),
  ["<c-d>"] = cmp.mapping.scroll_docs(4),

  ["<c-k>"] = cmp.mapping.confirm({ select = true }),

  ["<c-j>"] = cmp.mapping(function(_, _)
    if luasnip.expand_or_jumpable() then
      luasnip.expand_or_jump()
    else
      cmp.mapping.confirm({ select = true })
    end
  end, { "i", "s" }),
})

-- disable completion with tab
-- this helps with copilot setup
cmp_mappings["<Tab>"] = nil
cmp_mappings["<S-Tab>"] = nil
cmp_mappings["<CR>"] = nil

lsp.setup_nvim_cmp({
  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },
  mapping = cmp_mappings,
  sources = {
    { name = "path" },
    { name = "nvim_lsp", keyword_length = 3 },
    { name = "buffer", keyword_length = 3 },
    { name = "luasnip", keyword_length = 2 },
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
cmp.setup.filetype("gitcommit", {
  sources = cmp.config.sources({
    { name = "cmp_git" }, -- You can specify the `cmp_git` source if you were installed it.
  }, {
    { name = "buffer" },
  })
})

-- Use buffer source for `/` and `?` (if you enabled `native_menu`, this won't work anymore).
cmp.setup.cmdline({ "/", "?" }, {
  sources = {
    { name = "buffer" }
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
  setup_servers_on_start = true,
  set_lsp_keymaps = false,
  configure_diagnostics = true,
  cmp_capabilities = true,
  manage_nvim_cmp = true,
  call_servers = "local",
  sign_icons = {
    error = "✘",
    warn = "▲",
    hint = "⚑",
    info = ""
  }
})

local on_attach = function(client, bufnr)
  -- Enable completion triggered by <c-x><c-o>
  vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

  if client.name == "eslint" then
    vim.cmd.LspStop("eslint")
    return
  end

  whichkey.register({
    ["]d"] = { vim.diagnostic.goto_next, "diag goto next" },
    ["[d"] = { vim.diagnostic.goto_prev, "diag goto prev" },
  }, { mode = "n", prefix = "" })

  whichkey.register({
    d = {
      name = "diagnostics",
      ["f"] = { vim.diagnostic.open_float, "diag float" },
      ["l"] = { vim.diagnostic.setloclist, "diags in loclist" },
      ["n"] = { vim.diagnostic.goto_next, "]d" },
      ["p"] = { vim.diagnostic.goto_prev, "[d" },
      ["q"] = { vim.diagnostic.setqflist, "diags in loclist" },
    }
  }, { mode = "n", prefix = "<leader>" })

  whichkey.register({
    ["="] = { function() vim.lsp.buf.format { async = true } end, "format buffer" },
    l = {
      name = "lsp actions",
      ["a"] = { vim.lsp.buf.code_action, "code action" },
      ["wa"] = { vim.lsp.buf.add_workspace_folder, "wksp add folder" },
      ["wr"] = { vim.lsp.buf.remove_workspace_folder, "wksp remove folder" },
      ["D"] = { vim.lsp.buf.declaration, "declaration" },
      ["d"] = { vim.lsp.buf.definition, "definition" },
      ["="] = { function() vim.lsp.buf.format { async = true } end, "format buffer" },
      ["k"] = { vim.lsp.buf.hover, "hover" },
      ["h"] = { vim.lsp.buf.signature_help, "help" },
      ["r"] = { vim.lsp.buf.references, "references" },
      ["R"] = { vim.lsp.buf.rename, "rename symbol" },
      ["S"] = { vim.lsp.buf.workspace_symbol, "workspace symbol" },
      ["l"] = { function()
        print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
      end, "" },
    },
  }, { mode = "n", prefix = "<leader>" })
end

lsp.on_attach(on_attach)
lsp.setup()

lspconfig.pyright.setup({
  on_attach = on_attach,
  flags = { debounce_text_changes = 150 },
  root_dir = util.root_pattern(".venv", "venv", "pyrightconfig.json"),
  settings = {
    pyright = {
      disableLanguageServices = false,
      disableOrganizeImports = true
    },
    python = {
      analysis = {
        autoSearchPaths = true;
        useLibraryCodeForTypes = true,
        diagnosticMode = "openFilesOnly",
      },
    },
  },
})

-- Lua Diagnostics.: Undefined global `vim`.
-- luacheck reports 113 accessing undefined variable 'vim'
-- that is fixed by a setting in ~/.luacheckrc
lspconfig.sumneko_lua.setup({
  on_attach = on_attach,
  flags = { debounce_text_changes = 150 },
  settings = {
    Lua = {
      completion = {
        callSnippet = "Replace"
      },
      diagnostics = {
        globals = { "_", "_G", "vim", }
      },
    }
  }
})

-- debugging
-- vim.lsp.set_log_level("debug")
-- :LspLog
-- :LsPInfo -- diags
-- :LspInstall -- Choose a LS for the current FT
