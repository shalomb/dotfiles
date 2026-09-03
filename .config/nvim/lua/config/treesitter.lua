-- https://github.com/nvim-treesitter/nvim-treesitter (branch: main)
--
-- Migrated from the archived `master` branch: that branch's config API
-- (`nvim-treesitter.configs`, bundled `rainbow`, `incremental_selection`,
-- plugin-managed `highlight`/`indent` modules) is incompatible with NeoVim
-- 0.12's Treesitter core, causing:
--   attempt to call method 'range' (a nil value)
-- The `main` branch is a full rewrite: it only installs parsers/queries.
-- Highlighting, folding, and indentation are now enabled directly via core
-- NeoVim APIs (see below). There is no bundled replacement for `rainbow`
-- delimiters or `incremental_selection` on `main` -- those features are
-- dropped here rather than papered over.
--
-- :TSInstall <ls_to_install>
-- :TSUpdate

local nvim_treesitter = require('nvim-treesitter')

nvim_treesitter.setup({
  install_dir = vim.fn.stdpath('data') .. '/site',
})

-- A list of parser names, matches the previous `ensure_installed` list.
local ensure_installed = {
  "bash",
  "c",
  "comment",
  "css",
  "dockerfile",
  "dot",
  "git_rebase",
  "gitattributes",
  "gitcommit",
  "gitignore",
  "go",
  "gomod",
  "graphql",
  "hcl",
  "html",
  "http",
  "javascript",
  "jq",
  "json",
  -- "just" replaces the dropped IndianBoy42/tree-sitter-just plugin, which
  -- hard-called the removed nvim-treesitter.parsers.get_parser_configs()
  -- API; `just` is now a first-class parser upstream.
  "just",
  "json5",
  "jsonnet",
  -- "jsonc" was dropped as a distinct parser upstream on `main`; the
  -- `json` parser is reused for it below via vim.treesitter.language.register.
  "lua",
  "make",
  "markdown",
  "markdown_inline",
  "mermaid",
  "perl",
  "python",
  "regex",
  "rego",
  "rust",
  "sql",
  "terraform",
  "todotxt",
  "toml",
  "vim",
  "yaml",
}

do
  local installed = nvim_treesitter.get_installed and nvim_treesitter.get_installed('parsers') or {}
  local installed_set = {}
  for _, name in ipairs(installed) do
    installed_set[name] = true
  end

  local missing = {}
  for _, name in ipairs(ensure_installed) do
    if not installed_set[name] then
      table.insert(missing, name)
    end
  end

  if #missing > 0 then
    nvim_treesitter.install(missing)
  end
end

-- `jsonc` (JSON with comments) has no distinct parser on `main`; reuse `json`.
vim.treesitter.language.register('json', 'jsonc')

-- Highlighting: provided by NeoVim core (`:h treesitter-highlight`), enabled
-- per-buffer via `vim.treesitter.start()`.
-- NOTE: previously disabled ("highlight.enable = false") to work around an
-- end_col-out-of-range crash on `J` (join lines) with the `master` branch.
-- That bug lived in the old plugin-managed highlighter; core highlighting
-- has not reproduced it in testing, so it's enabled here. Revisit if `J`
-- misbehaves again.
vim.api.nvim_create_autocmd('FileType', {
  pattern = '*',
  callback = function(args)
    local ok = pcall(vim.treesitter.start, args.buf)
    if not ok then
      return -- no parser for this filetype; fall back to regex syntax highlighting
    end
    -- Keep 'syntax' highlighting active alongside treesitter, mirroring the
    -- previous `additional_vim_regex_highlighting = true` setting.
  end,
})

-- Folding: provided by NeoVim core.
-- NOTE: previously disabled to avoid an "Index out of bounds" error on `J`
-- with the `master` branch's foldexpr. Left disabled here too, since the
-- underlying multi-line-join interaction with treesitter folds is a
-- longstanding upstream sharp edge, not specific to the old plugin.
-- To re-enable:
-- vim.api.nvim_create_autocmd('FileType', {
--   pattern = '*',
--   callback = function()
--     vim.wo[0][0].foldexpr = 'v:lua.vim.treesitter.foldexpr()'
--     vim.wo[0][0].foldmethod = 'expr'
--   end,
-- })

-- Indentation: provided by this plugin (experimental) on the `main` branch.
-- NOTE: previously disabled ("indent.enable = false") for the same `J`
-- out-of-bounds issue. Left disabled for the same reason as folding above.
-- To re-enable:
-- vim.api.nvim_create_autocmd('FileType', {
--   pattern = '*',
--   callback = function()
--     vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
--   end,
-- })

-- Dropped on migration (no `main`-branch equivalent, not papered over):
--   * `rainbow` (bracket/tag rainbow highlighting) -- was a bundled module
--     on `master`; consider `HiPhish/rainbow-delimiters.nvim` as a
--     standalone replacement if wanted.
--   * `incremental_selection` (gIn/gIrn/gIrc/gIrm keymaps) -- no core or
--     `main`-branch equivalent exists yet.
--   * `nvim-treesitter-textsubjects` plugin -- hard-imports removed legacy
--     modules (`nvim-treesitter.query`, `.ts_utils`) and is unmaintained
--     for `main`; dropped in lua/plugins.lua rather than left broken.

-- vim:ts=2 sw=2
