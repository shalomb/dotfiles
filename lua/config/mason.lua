local mti = require('mason-tool-installer')

mti.setup {

  -- a list of all tools you want to ensure are installed upon
  -- start; they should be the names Mason uses for each tool
  ensure_installed = {
    { 'bash-language-server', auto_update = true }, -- you can turn off/on auto_update per tool
    'editorconfig-checker',
    'gofumpt',
    { 'golangci-lint', version = 'v1.47.0' }, -- you can pin a tool to a particular version
    'golines',
    'gomodifytags',
    'gopls',
    'gotests',
    'impl',
    'json-to-struct',
    'luacheck',
    'lua-language-server',
    'misspell',
    'revive',
    'shellcheck',
    'shfmt',
    'staticcheck',
    'stylua',
    'vim-language-server',
    'vint',
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
