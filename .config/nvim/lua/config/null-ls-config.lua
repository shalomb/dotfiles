-- null-ls

---@diagnostic disable-next-line, 113: 113
local vim = vim

local nullls = require("null-ls")

-- https://github.com/jose-elias-alvarez/null-ls.nvim/tree/main/lua/null-ls/builtins/formatting
local formatting = nullls.builtins.formatting
-- https://github.com/jose-elias-alvarez/null-ls.nvim/tree/main/lua/null-ls/builtins/diagnostics
local diagnostics = nullls.builtins.diagnostics
local code_actions = nullls.builtins.code_actions
local hover = nullls.builtins.hover
local completions = nullls.builtins.completion

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

nullls.setup {
  debounce = 150,
  debug = false,
  diagnostics_format = "#{m}",
  -- on_attach = opts.on_attach,
  root_dir = require("null-ls.utils").root_pattern(".git"),
  save_after_format = false,
  sources = {
    with_diagnostics_code(diagnostics.shellcheck),
    formatting.shfmt,
    -- formatting.fixjson,
    formatting.black.with { extra_args = { "--fast" } },
    -- formatting.autopep8,
    -- formatting.isort,
    -- formatting.autoflake,
    -- formatting.beautysh,
    formatting.black,
    with_root_file(formatting.stylua, "stylua.toml"),
    formatting.gofumpt,
    -- formatting.prettier.with {
    --   extra_filetypes = { "toml", "solidity" },
    --   extra_args = { "--no-semi", "--single-quote", "--jsx-single-quote" },
    -- },
    formatting.yamlfmt,

    code_actions.gitrebase,
    -- code_actions.refactoring, -- module not found
    code_actions.shellcheck,
    code_actions.shellcheck,

    -- completions.luasnip,
    completions.spell,
    completions.tags,

    -- code_actions.gitsigns,
    -- diagnostics.actionlint,
    diagnostics.ansiblelint,
    -- diagnostics.buf, -- protocol buffers
    -- diagnostics.cfn_lint,
    diagnostics.checkmake,
    diagnostics.codespell,
    -- diagnostics.commitlint,
    -- diagnostics.curlylint, -- jinja, django, nunjucks templates
    -- diagnostics.djlint, -- html linter/formatter
    -- diagnostics.dotenv_linter,
    -- diagnostics.editorconfig_checker, -- missing executable ec
    diagnostics.flake8,
    -- diagnostics.gitlint,
    diagnostics.golangci_lint,
    -- diagnostics.hadolint,
    -- diagnostics.jshint,
    -- diagnostics.jsonlint,
    -- diagnostics.ltrs, -- not found
    diagnostics.luacheck.with {
      settings = {
        Lua = {
          diagnostics = {
            globals = { "vim" }
          }
        }
      }
    },
    -- diagnostics.markdownlint,
    -- diagnostics.misspell,
    -- diagnostics.opacheck,
    -- diagnostics.perlimports,
    -- diagnostics.proselint, -- not found 
    -- diagnostics.protoc_gen_lint,
    -- diagnostics.protolint,
    -- diagnostics.pycodestyle,
    -- diagnostics.pydocstyle,
    -- diagnostics.pylama,
    -- diagnostics.pylint, -- can be customized, see BUILTINS.md
    -- diagnostics.pyproject_flake8,
    diagnostics.revive,
    -- diagnostics.rstcheck,
    -- diagnostics.ruff,
    -- diagnostics.semgrep,
    diagnostics.shellcheck,
    -- nullls.builtins.diagnostics.sqlfluff.with({
    --   extra_args = { "--dialect", "postgres" }, -- change to your dialect
    -- }),
    -- diagnostics.standardjs,
    diagnostics.staticcheck,
    -- diagnostics.stylelint,
    diagnostics.tidy,
    diagnostics.todo_comments,
    diagnostics.trail_space,
    diagnostics.vint,
    -- diagnostics.vulture,
    -- diagnostics.write_good, -- plugin missing
    diagnostics.yamllint,

    hover.dictionary,
    hover.printenv,
  },
}

-- function M.list_registered_providers_names(filetype)
--   local s = require "null-ls.sources"
--   local available_sources = s.get_available(filetype)
--   vim.pretty_print(vim.inspect(available_sources))
--   local registered = {}
--   for _, source in ipairs(available_sources) do
--     for method in pairs(source.methods) do
--       registered[method] = registered[method] or {}
--       table.insert(registered[method], source.name)
--     end
--   end
--   return registered
-- end

-- function M.list_registered_formatters(filetype)
--   local registered_providers = M.list_registered_providers_names(filetype)
--   vim.pretty_print(vim.inspect(registered_providers))
--   local method = null_ls.methods.FORMATTING
--   return registered_providers[method] or {}
-- end

-- function M.list_registered_linters(filetype)
--   local registered_providers = M.list_registered_providers_names(filetype)
--   vim.pretty_print(vim.inspect(registered_providers))
--   local method = null_ls.methods.DIAGNOSTICS
--   return registered_providers[method] or {}
-- end

-- M.list_registered_providers_names()

-- return M
