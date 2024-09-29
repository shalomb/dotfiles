-- lua

local vim = vim

vim.opt.completeopt = { "menu", "menuone", "noinsert", "noselect" }

local util = require("lspconfig").util
local whichkey = require("which-key")
local mason = require('mason')

--- Mason ---

mason.setup({
  log_level = vim.log.levels.INFO,
  max_concurrent_installers = 8,
  ui = {
    border = 'rounded'
  }
})

local mti = require('mason-tool-installer')

mti.setup {

  -- a list of all tools you want to ensure are installed upon
  -- start; they should be the names Mason uses for each tool
  ensure_installed = {
    'ansible-language-server',
    'ansible-lint',
    'ansiblels',
    'autoflake',
    'autopep8',
    'awk_ls',
    'bash-language-server',
    'bashls',
    'beautysh',
    'black',
    'cfn-lint',
    'codelldb',
    'commitlint',
    'css-lsp',
    'cssls',
    'debugpy',
    'delve',
    'dockerfile-language-server',
    'editorconfig-checker',
    'flake8',
    'gitlint',
    'gofumpt',
    'goimports',
    'golangci-lint',
    'golines',
    'gomodifytags',
    'gopls',
    'gotests',
    -- 'helm-ls',
    'html',
    'html-lsp',
    'impl',
    'isort',
    'jq-lsp',
    'json-lsp',
    'json-to-struct',
    'jsonlint',
    'jsonls',
    'lua-language-server',
    'lua_ls',
    'misspell',
    'mypy',
    'perlnavigator',
    'powershell-editor-services',
    'prettier',
    'pyright',
    'reorder-python-imports',
    'revive',
    'ruff',
    'rust-analyzer',
    'rust_analyzer',
    'shellcheck',
    'shellharden',
    'shfmt',
    'sqlfmt',
    'sqlls',
    'staticcheck',
    'stylua',
    'terraform-ls',
    'tflint',
    'tfsec',
    -- 'tsserver',
    'typescript-language-server',
    'vim-language-server',
    'vimls',
    'vint',
    'yaml-language-server',
    'yamlfmt',
    'yamllint',
    'yamlls',
    -- 'luacheck',
    -- 'sqlls',
    { 'bash-language-server', auto_update = true }, -- you can turn off/on auto_update per tool
    { 'golangci-lint' },                            -- version = 'v1.47.0' -- you can pin a tool to a particular version
  },

  -- if set to true this will check each tool for updates. If updates
  -- are available the tool will be updated. This setting does not
  -- affect :MasonToolsUpdate or :MasonToolsInstall.
  -- Default: false
  auto_update = false,

  -- automatically install / update on startup. If set to false nothing
  -- will happen on startup. You can use :MasonToolsInstall or
  -- :MasonToolsUpdate to install tools and check for updates.
  -- Default: true
  run_on_start = true,

  -- set a delay (in ms) before the installation starts. This is only
  -- effective if run_on_start is set to true.
  -- e.g.: 5000 = 5 second delay, 10000 = 10 second delay, etc...
  -- Default: 0
  start_delay = 3000, -- 3 second delay

}

-- On update run
-- :MasonToolsInstall

---- lspconfig ----

local lspconfig = require('lspconfig')
local capabilities = require('cmp_nvim_lsp').default_capabilities()

require('mason-lspconfig').setup_handlers({
  function(server_name)
    lspconfig[server_name].setup({
      capabilities = capabilities,
    })
  end,
})

lspconfig.lua_ls.setup({
  -- on_attach = lsp.default_keymaps({buffer = bufnr}),
  capabilities = capabilities,
  flags = { debounce_text_changes = 150 },
  settings = {
    Lua = {
      completion = {
        callSnippet = "Replace"
      },
      diagnostics = {
        globals = { "_", "_G", "vim", }
      },
      workspace = {
        checkThirdParty = false,
      },
    }
  }
})

lspconfig.pyright.setup({
  -- on_attach = on_attach,
  capabilities = capabilities,
  flags = { debounce_text_changes = 150 },
  root_dir = util.root_pattern(".venv", "venv", "pyrightconfig.json"),
  settings = {
    pyright = {
      disableLanguageServices = false,
      disableOrganizeImports = true
    },
    python = {
      analysis = {
        autoSearchPaths = true,
        useLibraryCodeForTypes = true,
        diagnosticMode = "openFilesOnly",
      },
    },
  },
})

lspconfig.rust_analyzer.setup {
  -- Server-specific settings. See `:help lspconfig-setup`
  capabilities = capabilities,
  settings = {
    ['rust-analyzer'] = {},
  },
}

-- lspconfig.gopls.setup({})

-- Global mappings.
-- See `:help vim.diagnostic.*` for documentation on any of the below functions

vim.api.nvim_buf_set_option(0, "omnifunc", "v:lua.vim.lsp.omnifunc")

-- luasnip setup
local luasnip = require 'luasnip'

-- nvim-cmp setup
local cmp = require 'cmp'

local cmp_select = { behavior = cmp.SelectBehavior.Select }

cmp.setup {
  enabled = function()
    local buftype = vim.api.nvim_buf_get_option(0, "buftype")
    if buftype == "prompt" then
      return false
    end
    return true
  end,

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

  mapping = cmp.mapping.preset.insert({
    ['<C-p>'] = cmp.mapping.select_prev_item(cmp_select),
    ['<C-n>'] = cmp.mapping.select_next_item(cmp_select),
    ['<C-u>'] = cmp.mapping.scroll_docs(-4), -- Up
    ['<C-d>'] = cmp.mapping.scroll_docs(4),  -- Down

    ["<C-j>"] = cmp.mapping.confirm({ select = true }),
    ["<C-k>"] = cmp.mapping(function(_, _)
      if luasnip.expand_or_jumpable() then
        luasnip.expand_or_jump()
      else
        cmp.mapping.confirm({ select = true })
      end
    end, { "i", "s" }),

    -- C-b (back) C-f (forward) for snippet placeholder navigation.
    ['<C-Space>'] = cmp.mapping.complete(),

    ['<Tab>'] = nil,
    ['<S-Tab>'] = nil,
    ['<CR>'] = nil,
    ['<C-y>'] = nil,
    ['<C-e>'] = nil,

  }),

  preselect = cmp.PreselectMode.None,

  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },

  sources = {
    -- TODO - tmux, ctags, git commits
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
        get_bufnrs = function()
          return vim.api.nvim_list_bufs()
        end
      }
    },
  },

  window = {
    completion = cmp.config.window.bordered(),
    documentation = cmp.config.window.bordered(),
  },
}

local on_attach = function(args)
  local bufnr = args.buf
  local client = vim.lsp.get_client_by_id(args.data.client_id)

  -- Enable completion triggered by <c-x><c-o>
  vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

  if client.name == "eslint" then
    vim.cmd.LspStop("eslint")
    return
  end

  -- Buffer local mappings.
  -- See `:help vim.lsp.*` for documentation on any of the below functions
  local opts = { buffer = args.buf }
  vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, opts)
  vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
  vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
  vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
  -- vim.keymap.set('n', '<C-k>', vim.lsp.buf.signature_help, opts)
  vim.keymap.set('n', '<space>wa', vim.lsp.buf.add_workspace_folder, opts)
  vim.keymap.set('n', '<space>wr', vim.lsp.buf.remove_workspace_folder, opts)
  vim.keymap.set('n', '<space>wl', function()
    print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
  end, opts)
  vim.keymap.set('n', '<space>D', vim.lsp.buf.type_definition, opts)
  vim.keymap.set('n', '<space>rn', vim.lsp.buf.rename, opts)
  vim.keymap.set({ 'n', 'v' }, '<space>ca', vim.lsp.buf.code_action, opts)
  vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
  vim.keymap.set('n', '<space>f', function()
    vim.lsp.buf.format { async = true }
  end, opts)

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
      ["="] = { function() vim.lsp.buf.format { async = true } end, "format buffer" },
      ["a"] = { vim.lsp.buf.code_action, "code action" },
      ["D"] = { vim.lsp.buf.declaration, "declaration" },
      ["d"] = { vim.lsp.buf.definition, "definition" },
      ["h"] = { vim.lsp.buf.signature_help, "help" },
      ["k"] = { vim.lsp.buf.hover, "hover" },
      ["l"] = { function()
        print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
      end, "list wksp folders" },
      ["r"] = { vim.lsp.buf.references, "references" },
      ["R"] = { vim.lsp.buf.rename, "rename symbol" },
      ["S"] = { vim.lsp.buf.workspace_symbol, "workspace symbol" },
      ["wa"] = { vim.lsp.buf.add_workspace_folder, "wksp add folder" },
      ["wr"] = { vim.lsp.buf.remove_workspace_folder, "wksp remove folder" },
    },
  }, { mode = "n", prefix = "<leader>" })
end

-- Use LspAttach autocommand to only map the following keys
-- after the language server attaches to the current buffer
vim.api.nvim_create_autocmd('LspAttach', {
  desc = 'LSP actions',
  group = vim.api.nvim_create_augroup('UserLspConfig', {}),
  callback = on_attach
})

-- -- debugging
-- -- vim.lsp.set_log_level("debug")
-- -- :LspLog
-- -- :LsPInfo -- diags
-- -- :LspInstall -- Choose a LS for the current FT
