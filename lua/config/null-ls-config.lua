-- null-ls

local M = {}

local null_ls = require("null-ls")

-- https://github.com/jose-elias-alvarez/null-ls.nvim/tree/main/lua/null-ls/builtins/formatting
local formatting = null_ls.builtins.formatting

-- https://github.com/jose-elias-alvarez/null-ls.nvim/tree/main/lua/null-ls/builtins/diagnostics
local diagnostics = null_ls.builtins.diagnostics
local code_actions = null_ls.builtins.code_actions
local hover = null_ls.builtins.hover

local with_root_file = function(builtin, file)
  return builtin.with {
    condition = function(utils)
      return utils.root_has_file(file)
    end,
  }
end

local with_diagnostics_code = function(builtin)
  return builtin.with {
    diagnostics_format = "#{m} [#{c}]",
  }
end

function M.setup(opts)
  null_ls.setup {
    debug = false,
    sources = {
      with_diagnostics_code(diagnostics.shellcheck),
      formatting.shfmt,
      formatting.fixjson,
      formatting.black.with { extra_args =  { "--fast" } },
      formatting.autopep8,
      formatting.isort,
      with_root_file(formatting.stylua, "stylua.toml"),
      formatting.gofumpt,
      formatting.prettier,
      formatting.prettier.with {
        extra_filetypes = { "toml", "solidity" },
        extra_args = { "--no-semi", "--single-quote", "--jsx-single-quote" },
      },
      code_actions.gitrebase,
      code_actions.gitsigns,
      diagnostics.flake8,
      diagnostics.write_good,
      hover.dictionary,
    },
    debug = true,
    debounce = 150,
    save_after_format = false,
    on_attach = opts.on_attach,
    root_dir = require("null-ls.utils").root_pattern(".git"),
  }
end

function M.list_registered_providers_names(filetype)
  local s = require "null-ls.sources"
  local available_sources = s.get_available(filetype)
  local registered = {}
  for _, source in ipairs(available_sources) do
    for method in pairs(source.methods) do
      registered[method] = registered[method] or {}
      table.insert(registered[method], source.name)
    end
  end
  return registered
end

function M.list_registered_formatters(filetype)
  local registered_providers = M.list_registered_providers_names(filetype)
  local method = null_ls.methods.FORMATTING
  return registered_providers[method] or {}
end

function M.list_registered_linters(filetype)
  local registered_providers = M.list_registered_providers_names(filetype)
  local method = null_ls.methods.DIAGNOSTICS
  return registered_providers[method] or {}
end

return M
