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
    'awk_ls',
    'bash-language-server',
    'bashls',
    'beautysh',
    'cfn-lint',
    'codelldb',
    'commitlint',
    'css-lsp',
    'cssls',
    'debugpy',
    'delve',
    'dockerfile-language-server',
    'editorconfig-checker',
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
