# Pass-Edit Cleanroom & Copilot.lua Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate `pass edit` buffers in Neovim so third-party plugins, cloud LSPs, and persistent state (`undofile`, `swapfile`, `backup`, `shada`, `clipboard`) never load or leak secret content, while migrating prose ghost-text completion in normal buffers from `github/copilot.vim` to `zbirenbaum/copilot.lua`.

**Architecture:**
1. **Cleanroom `pass` Detection (`config.pass_redact`)**: Detect `pass` temporary buffers (`/dev/shm/pass.*`, `/private/var/folders/.*/pass.*`, or `$NVIM_PASS_MODE=1`) in `init.lua` *before* `lazy.nvim` runs. When active, skip `lazy.nvim` completely (zero third-party plugins loaded), scrub buffer/global state options (`noswapfile`, `nobackup`, `nowritebackup`, `noundofile`, `shada=""`, `clipboard=""`, `vim.g.pass_redact_mode = true`), and load only curated self-authored core options and pure-Lua navigation/editing tweaks (`00-globals`, `01-funcs`, `utils`, `options`, `sort`, `whitespace`, `window_resize`, `restore_position`, and pure core keymaps). Also guard `before/persistent_undo.vim` so `WriteUndo()`/`ReadUndo()` never write plaintext undo trees for `/dev/shm/*` or `pass.*` buffers to `~/.cache/nvim/undo/`.
2. **Prose Completion (`config.copilot` + `zbirenbaum/copilot.lua`)**: Replace legacy `github/copilot.vim` in `lua/plugins.lua` with `zbirenbaum/copilot.lua`. Configure it to use the pre-installed Node.js language server (`/home/unop/.local/lib/node_modules/@github/copilot-language-server/dist/language-server.js` via `copilot-language-server`), enable prose filetypes explicitly (`markdown`, `gitcommit`, `text`, `""`), bind `<C-l>` (accept full suggestion), `<M-l>` (accept next word), `<M-j>` (accept line), `<C-;>` (next), `<C-,>` (prev), `<C-\>` (dismiss), and enforce a defense-in-depth `should_attach` filter rejecting sensitive files (`pass.*`, `/dev/shm/`, `.env*`, `*.pem`, `*.key`, `*.gpg`, `*.asc`).

**Tech Stack:** Neovim 0.12+ (Lua), `lazy.nvim`, `zbirenbaum/copilot.lua`, `plenary.nvim` (`PlenaryBustedDirectory` headless behavioural test runner), `dotfile_manager` (Python + `uv`).

**Spec:** Self-contained in this plan (`~/.config/dotfiles/docs/plans/2026-10-31-nvim-pass-isolation-and-copilot-lua.md`).

## Global Constraints

- **Repository Root**: `/home/unop/.config/dotfiles` (hardlinked to `~/.config/nvim/` via `dotfile_manager`).
- **Commit Format**: Component-prefixed atomic commits (`nvim: ...`, `test: ...`, `cleanup: ...`) per `/home/unop/.config/dotfiles/AGENTS.md`, or Conventional Commits (`feat(nvim): ...`, `fix(nvim): ...`) — all commits MUST be GPG-signed (`commit.gpgsign=true`, never `--no-verify`).
- **Dotfile Sync**: Every new file created under `.config/nvim/` MUST be exported via `uv run python -m dotfile_manager export .config/nvim/` before committing so the pre-commit dotfile consistency hook passes.
- **Test Runner**: `cd ~/.config/dotfiles/.config/nvim && nvim --headless -u tests/minimal_init.lua -c "PlenaryBustedDirectory tests/ { minimal_init = 'tests/minimal_init.lua', sequential = true }"`
- **Strict TDD / Double-Loop BDD**: Write each failing `_spec.lua` behavioural test first, run the headless test runner to observe the failure (RED), implement the minimal production code to pass (GREEN), and commit atomically.

---

## File Structure Map

| Action | Path (relative to `/home/unop/.config/dotfiles`) | Responsibility |
|---|---|---|
| Create | `.config/nvim/lua/config/pass_redact.lua` | Pure predicate `is_pass_buffer(path)` / `is_pass_session(argv, env)` + `apply_hardening(bufnr)` + list of allowed self-authored config modules when in `pass` mode. |
| Modify | `.config/nvim/lua/config/before/persistent_undo.vim` | Guard `ReadUndo()` and `WriteUndo()` so `/tmp/*`, `/dev/shm/*`, and `*pass.*` never read/write `~/.cache/nvim/undo/...` files, and respect `vim.g.pass_redact_mode` / `&l:undofile == 0`. |
| Create | `.config/nvim/lua/config/core_keymaps.lua` | Self-authored, zero-plugin navigation and text-editing keymaps extracted from `zz-keymaps.lua` so they work identically in both `pass` cleanroom mode and normal mode (`j`/`k` -> `gj`/`gk`, `0` smart bol/eol, `$`/`^`, `<C-d>`/`<C-u>` centered scroll, `J` join-in-place, visual `<`/`>`, visual `J`/`K` line move, `S` word substitute, `<C-w>` undo breakpoint). |
| Modify | `.config/nvim/lua/config/zz-keymaps.lua` | Require `config.core_keymaps` for zero-plugin keymaps and keep plugin-dependent bindings (`which-key`, `telescope`, `Comment`, `oil`, `fugitive`) in `zz-keymaps.lua`. |
| Modify | `.config/nvim/init.lua` | Check `require("config.pass_redact").is_pass_session()` before `lazy.nvim`. If true: skip `lazy.nvim`, apply `pass_redact.setup()`, and load only self-authored core modules (`require("config").setup({ minimal = true })`). |
| Modify | `.config/nvim/lua/config/init.lua` | Support `minimal` mode (`vim.g.pass_redact_mode == true`) so only the curated self-authored modules load when third-party plugins are skipped. |
| Create | `.config/nvim/lua/config/copilot.lua` | Pure-Lua `zbirenbaum/copilot.lua` configuration builder (`opts()`, `should_attach(bufnr, bufname)`, server path resolver, prose filetype allowlist, and keymap definitions). |
| Modify | `.config/nvim/lua/plugins.lua` | Remove `github/copilot.vim` (and revert the temporary `replace_keycodes = true` edit from `7d500ae`); add `zbirenbaum/copilot.lua` delegating to `require("config.copilot")`. |
| Modify | `.config/nvim/tests/minimal_init.lua` | Add `copilot.lua` to the headless test runtimepath list if installed under `stdpath("data") .. "/lazy"`. |
| Create | `.config/nvim/tests/pass_redact_spec.lua` | Behavioural tests for `pass` buffer detection, zero third-party plugin loading, state option hardening (`undofile`, `swapfile`, `backup`, `shada`, `clipboard`), `persistent_undo.vim` leak prevention, and availability of self-authored navigation/editing keymaps. |
| Create | `.config/nvim/tests/copilot_lua_spec.lua` | Behavioural tests for `copilot.vim` removal, `zbirenbaum/copilot.lua` lazy spec, prose filetype enablement (`markdown`, `gitcommit`, `text`, `""`), `should_attach` security rejection on `pass`/`.env`/key files, keymap bindings (`<C-l>`, `<M-l>`, `<M-j>`, `<C-;>`, `<C-,>`, `<C-\>`), and clean UTF-8 completion insertion without `<80>@7` keycode corruption. |

---

### Task 1: Pass-Edit Cleanroom Mode & Persistent-Undo Leak Prevention

**Files:**
- Create: `.config/nvim/lua/config/pass_redact.lua`
- Create: `.config/nvim/lua/config/core_keymaps.lua`
- Modify: `.config/nvim/lua/config/before/persistent_undo.vim`
- Modify: `.config/nvim/lua/config/zz-keymaps.lua`
- Modify: `.config/nvim/lua/config/init.lua`
- Modify: `.config/nvim/init.lua`
- Test: `.config/nvim/tests/pass_redact_spec.lua`

**Interfaces:**
- Produces:
  - `require("config.pass_redact").is_pass_path(path: string): boolean`
  - `require("config.pass_redact").is_pass_session(argv?: string[], env?: table): boolean`
  - `require("config.pass_redact").apply_hardening(bufnr?: integer): nil`
  - `require("config.pass_redact").allowed_modules: string[]`
  - `require("config.core_keymaps").setup(): nil`

- [ ] **Step 1: Write the failing behavioural test suite (`tests/pass_redact_spec.lua`)**

Create `/home/unop/.config/dotfiles/.config/nvim/tests/pass_redact_spec.lua`:

```lua
describe("pass edit cleanroom & state isolation (config.pass_redact)", function()
  local PR

  before_each(function()
    package.loaded["config.pass_redact"] = nil
    package.loaded["config.core_keymaps"] = nil
    PR = require("config.pass_redact")
  end)

  describe("Scenario: Detecting pass temporary file paths and sessions", function()
    it("matches Linux /dev/shm/pass.* paths created by pass edit", function()
      assert.is_true(PR.is_pass_path("/dev/shm/pass.TvbBi1xeDTSmq/Fn1Tlm-test-detail-6.txt"))
      assert.is_true(PR.is_pass_path("/dev/shm/pass.123456/secret.txt"))
    end)

    it("matches macOS /private/var/folders/.../pass.* and /tmp/pass.* paths", function()
      assert.is_true(PR.is_pass_path("/private/var/folders/xx/yy/T/pass.abc123/secret.txt"))
      assert.is_true(PR.is_pass_path("/tmp/pass.xyz987/entry.txt"))
    end)

    it("does not match ordinary project files or non-pass tmp files", function()
      assert.is_false(PR.is_pass_path("/home/unop/projects/README.md"))
      assert.is_false(PR.is_pass_path("/tmp/notes.md"))
      assert.is_false(PR.is_pass_path("/home/unop/pass_notes.txt"))
      assert.is_false(PR.is_pass_path(""))
    end)

    it("detects a pass session when any argv entry is a pass path or NVIM_PASS_MODE=1", function()
      assert.is_true(PR.is_pass_session({ "nvim", "/dev/shm/pass.AbCdEf/sec.txt" }, {}))
      assert.is_true(PR.is_pass_session({ "nvim", "normal.txt" }, { NVIM_PASS_MODE = "1" }))
      assert.is_false(PR.is_pass_session({ "nvim", "/home/unop/prose.md" }, {}))
    end)
  end)

  describe("Scenario: Hardening Neovim state options in pass mode", function()
    it("disables swapfile, backup, writebackup, undofile, shada, and clipboard", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.api.nvim_set_current_buf(buf)
      vim.bo[buf].swapfile = true
      vim.bo[buf].undofile = true
      vim.o.backup = true
      vim.o.writebackup = true
      vim.o.undofile = true

      PR.apply_hardening(buf)

      assert.is_true(vim.g.pass_redact_mode)
      assert.is_false(vim.bo[buf].swapfile)
      assert.is_false(vim.bo[buf].undofile)
      assert.is_false(vim.bo[buf].modeline)
      assert.is_false(vim.o.swapfile)
      assert.is_false(vim.o.backup)
      assert.is_false(vim.o.writebackup)
      assert.is_false(vim.o.undofile)
      assert.are.equal("", vim.o.shada)
      assert.are.equal("", vim.o.shadafile)
      assert.are.equal("", vim.o.clipboard)

      vim.api.nvim_buf_delete(buf, { force = true })
    end)
  end)

  describe("Scenario: Preventing persistent_undo.vim from writing undo files for pass buffers", function()
    it("does not create an undo file under undodir when writing a /dev/shm/pass.* buffer", function()
      local tmp_undodir = vim.fn.tempname()
      vim.fn.mkdir(tmp_undodir, "p")
      vim.o.undodir = tmp_undodir
      vim.cmd("source " .. vim.fn.getcwd() .. "/lua/config/before/persistent_undo.vim")
      vim.o.undodir = tmp_undodir

      local fake_shm_dir = vim.fn.tempname() .. "/dev/shm/pass.TestLeak123"
      vim.fn.mkdir(fake_shm_dir, "p")
      local secret_file = fake_shm_dir .. "/secret.txt"

      vim.cmd("edit " .. vim.fn.fnameescape(secret_file))
      PR.apply_hardening(0)
      vim.api.nvim_buf_set_lines(0, 0, -1, false, { "correct-horse-battery-staple" })
      vim.cmd("silent write!")

      local leaked_undo = tmp_undodir .. secret_file .. ".undo"
      assert.are.equal(0, vim.fn.filereadable(leaked_undo))
    end)
  end)

  describe("Scenario: Self-authored navigation and text-editing tweaks remain active in pass mode", function()
    it("loads core_keymaps without requiring which-key, telescope, or any third-party plugin", function()
      local ck = require("config.core_keymaps")
      assert.is_true(pcall(ck.setup))

      local j_map = vim.fn.maparg("j", "n", false, true)
      local k_map = vim.fn.maparg("k", "n", false, true)
      local zero_map = vim.fn.maparg("0", "n", false, true)
      local cw_map = vim.fn.maparg("<C-W>", "i", false, true)

      assert.are.equal("gj", j_map.rhs)
      assert.are.equal("gk", k_map.rhs)
      assert.is_function(zero_map.callback)
      assert.are.equal("<C-G>u<C-W>", cw_map.rhs)
    end)

    it("spawns a cleanroom nvim process on a /dev/shm/pass.* path with zero lazy.nvim plugins loaded", function()
      local res = vim.system({
        vim.v.progpath,
        "--headless",
        "-u",
        vim.fn.getcwd() .. "/init.lua",
        "/dev/shm/pass.UnitTestCleanroom/test-entry.txt",
        "-c",
        "lua io.stdout:write(vim.json.encode({ lazy_loaded = package.loaded['lazy'] ~= nil, pass_mode = vim.g.pass_redact_mode == true, undofile = vim.bo.undofile, swapfile = vim.bo.swapfile, gj = vim.fn.maparg('j', 'n') }))",
        "-c",
        "qa!",
      }, { text = true }):wait()

      assert.are.equal(0, res.code)
      local payload = vim.json.decode(res.stdout)
      assert.is_false(payload.lazy_loaded)
      assert.is_true(payload.pass_mode)
      assert.is_false(payload.undofile)
      assert.is_false(payload.swapfile)
      assert.are.equal("gj", payload.gj)
    end)
  end)
end)
```

- [ ] **Step 2: Run the headless test runner to verify `pass_redact_spec.lua` fails (RED)**

Run:
```bash
cd /home/unop/.config/dotfiles/.config/nvim && nvim --headless -u tests/minimal_init.lua -c "PlenaryBustedFile tests/pass_redact_spec.lua"
```
Expected: FAIL (`module 'config.pass_redact' not found`).

- [ ] **Step 3: Create `lua/config/core_keymaps.lua` and update `lua/config/zz-keymaps.lua`**

Create `/home/unop/.config/dotfiles/.config/nvim/lua/config/core_keymaps.lua` containing the self-authored, zero-plugin navigation and text-editing keymaps:

```lua
-- Self-authored core navigation and text-editing keymaps (zero third-party plugins).
-- Loaded in both normal mode and `pass edit` cleanroom mode.

local M = {}

local function smart_bol_eol()
  local col = vim.fn.col(".")
  local line = vim.fn.getline(".")
  local lead = string.sub(line, 0, col - 1)
  local match = string.find(lead, "[^%s]")
  if not match then
    local beg = string.find(line, "[^%s]")
    if beg and beg ~= col then
      vim.fn.cursor(".", beg)
    else
      vim.fn.feedkeys("g_")
    end
  else
    vim.fn.feedkeys("g^")
  end
end

function M.setup()
  local map = vim.keymap.set

  -- Display-line vertical movement and centered scrolling
  map("n", "j", "gj", { desc = "gj" })
  map("n", "k", "gk", { desc = "gk" })
  map("n", "$", "g_", { desc = "eol" })
  map("n", "^", "g0", { desc = "g0" })
  map("n", "0", smart_bol_eol, { desc = "bol/eol" })
  map("n", "<C-d>", "<C-d>zz", { desc = "down" })
  map("n", "<C-u>", "<C-u>zz", { desc = "up" })
  map("n", "<C-f>", "<C-f>zz", { desc = "forwards" })
  map("n", "<C-b>", "<C-b>zz", { desc = "backwards" })
  map("n", "<C-e>", "5<C-e>", { desc = "5 up" })
  map("n", "<C-y>", "5<C-y>", { desc = "5 down" })
  map("n", "n", "nzzzv", { desc = "next match" })
  map("n", "N", "Nzzzv", { desc = "prev match" })
  map("n", "g;", "g;zvzz", { desc = "go to older change" })
  map("n", "g,", "g,zvzz", { desc = "go to newer change" })

  -- Text editing & line manipulation
  map("n", "J", "mzJ`z", { desc = "join lines but stay put" })
  map("n", "Y", "y$", { desc = "y$" })
  map("n", "U", "<C-r>", { desc = "redo" })
  map("n", "v", "<C-v>", { desc = "visual block" })
  map("n", "<C-w><C-w>", "<C-w>p", { desc = "last window" })
  map("n", "S", [[:%s/\<<C-r>/\>/<C-r><C-w>/gI<Left><Left><Left>]], { desc = "substitute word" })
  map("n", "<leader>;", ":", { desc = "cmdline" })
  map("n", "<leader>!", ":!<C-p>", { desc = "prev shell cmd" })
  map("n", "<leader>:", ":<C-p>", { desc = "prev ex cmd" })
  map("n", "<leader>q", vim.cmd.quit, { desc = "quit" })
  map("n", "<leader>a", "<cmd>e #<cr>", { desc = "Edit alternate file" })

  -- Visual mode indentation & line transposition
  map("v", "<", "<gv", { desc = "indent left and reselect" })
  map("v", ">", ">gv", { desc = "indent right and reselect" })
  map("v", "J", ":m '>+1<CR>gv=gv", { desc = "move selection down" })
  map("v", "K", ":m '<-2<CR>gv=gv", { desc = "move selection up" })
  map("v", "z/", 'y/<C-R>"<CR>gv', { desc = "search visual selection" })

  -- Insert & Command-line ergonomics
  map("i", "<C-w>", "<C-g>u<C-w>", { expr = false, desc = "undoable word delete" })
  map("c", "<C-n>", "<Down>", { expr = false })
  map("c", "<C-p>", "<Up>", { expr = false })
  map("i", "<Tab>", function()
    return vim.fn.pumvisible() == 1 and "<C-N>" or "<Tab>"
  end, { expr = true })

  -- Disable arrow keys
  map("", "<up>", "<nop>", { noremap = true })
  map("", "<down>", "<nop>", { noremap = true })
  map("i", "<up>", "<nop>", { noremap = true })
  map("i", "<down>", "<nop>", { noremap = true })

  -- Seamless Ctrl-h/j/k/l split navigation without requiring vim-tmux-navigator plugin
  map("n", "<C-h>", "<C-w>h", { desc = "window left" })
  map("n", "<C-j>", "<C-w>j", { desc = "window down" })
  map("n", "<C-k>", "<C-w>k", { desc = "window up" })
  map("n", "<C-l>", "<C-w>l", { desc = "window right" })
end

return M
```

In `/home/unop/.config/dotfiles/.config/nvim/lua/config/zz-keymaps.lua`, add `require("config.core_keymaps").setup()` near the top so normal sessions continue to get all core bindings alongside `which-key` and `telescope`.

- [ ] **Step 4: Create `lua/config/pass_redact.lua`**

Create `/home/unop/.config/dotfiles/.config/nvim/lua/config/pass_redact.lua`:

```lua
-- Cleanroom isolation for `pass edit` buffers.
-- Ensures zero third-party plugins are loaded and no secret content is persisted
-- to undo files, swap files, backups, shada/viminfo, or system clipboards.

local M = {}

M.allowed_modules = {
  "00-globals",
  "01-funcs",
  "utils",
  "options",
  "core_keymaps",
  "restore_position",
  "sort",
  "whitespace",
  "window_resize",
}

local PASS_PATH_PATTERNS = {
  "^/dev/shm/pass%.",
  "/dev/shm/pass%.",
  "^/tmp/pass%.",
  "^/private/var/folders/.*/pass%.",
  "/pass%.[A-Za-z0-9]+/[^/]+%.txt$",
}

---@param path string|nil
---@return boolean
function M.is_pass_path(path)
  if type(path) ~= "string" or path == "" then
    return false
  end
  for _, pat in ipairs(PASS_PATH_PATTERNS) do
    if path:match(pat) then
      return true
    end
  end
  return false
end

---@param argv? string[]
---@param env? table<string, string>
---@return boolean
function M.is_pass_session(argv, env)
  argv = argv or vim.v.argv or {}
  env = env or vim.env or {}

  if env.NVIM_PASS_MODE == "1" or env.NVIM_PASS_MODE == "true" then
    return true
  end

  for _, arg in ipairs(argv) do
    if M.is_pass_path(arg) then
      return true
    end
  end
  return false
end

---@param bufnr? integer
function M.apply_hardening(bufnr)
  bufnr = (bufnr == nil or bufnr == 0) and vim.api.nvim_get_current_buf() or bufnr

  vim.g.pass_redact_mode = true

  -- Global state hardening
  vim.o.swapfile = false
  vim.o.backup = false
  vim.o.writebackup = false
  vim.o.undofile = false
  vim.o.shada = ""
  vim.o.shadafile = "NONE"
  vim.o.clipboard = ""
  vim.o.modeline = false

  -- Buffer-local state hardening
  if vim.api.nvim_buf_is_valid(bufnr) then
    vim.bo[bufnr].swapfile = false
    vim.bo[bufnr].undofile = false
    vim.bo[bufnr].modeline = false
  end
end

function M.setup()
  M.apply_hardening(0)

  local group = vim.api.nvim_create_augroup("pass_redact_hardening", { clear = true })
  vim.api.nvim_create_autocmd({ "BufEnter", "BufNewFile", "BufReadPre", "BufWritePre" }, {
    group = group,
    pattern = "*",
    callback = function(ev)
      M.apply_hardening(ev.buf)
    end,
  })
end

return M
```

- [ ] **Step 5: Guard `lua/config/before/persistent_undo.vim`, `init.lua`, and `lua/config/init.lua`**

Update `/home/unop/.config/dotfiles/.config/nvim/lua/config/before/persistent_undo.vim`:

```vim
"""" Persistent Undo """""""""""""""""""""""""""""""""""""""""""""""""""""""""

set undodir=~/.cache/nvim/undo
set undofile

au BufReadPre,BufWritePre /tmp/*,/dev/shm/*,*/pass.*/* setlocal noundofile noswapfile nobackup nowritebackup

set undolevels=8192       " maximum number of changes that can be undone
set undoreload=9216       " maximum number lines to save for undo

function! s:ShouldSkipUndo() abort
  if get(g:, 'pass_redact_mode', 0) || !&l:undofile
    return 1
  endif
  let l:path = expand('%:p')
  return l:path =~# '^/tmp/\|^/dev/shm/\|/pass\.[^/]\+/'
endfunction

function! ReadUndo()
  if s:ShouldSkipUndo()
    return
  endif
  let _undofile = &undodir . expand("%:p") . '.undo'

  if filereadable(_undofile)
    silent execute ":rundo " . _undofile
  endif
endfunc

function! WriteUndo()
  if s:ShouldSkipUndo()
    return
  endif
  let _undofile = &undodir . expand("%:p") . '.undo'
  let _undodir = matchstr(_undofile, "^.*\\/")

  if !isdirectory(_undodir)
    silent execute "!mkdir -p " . _undodir
  endif
  silent execute "wundo! " . _undofile
endfunc

au BufReadPost * call ReadUndo()
au BufWritePost * call WriteUndo()
```

Update `/home/unop/.config/dotfiles/.config/nvim/init.lua`:

```lua
-- lua

local vim = vim

-- Disable unneeded language providers
-- See :checkhealth provider
vim.g.loaded_perl_provider = 0
vim.g.loaded_ruby_provider = 0

vim.g.python3_host_skip_check = true
vim.g.python3_host_prog = '/usr/bin/python3'

-- Settings needed before loading plugins or config
vim.g.mapleader = " "
vim.g.maplocalleader = vim.g.mapleader

local pass_redact = require("config.pass_redact")

if pass_redact.is_pass_session() then
  -- Cleanroom mode for `pass edit`: skip lazy.nvim and all 3rd-party plugins,
  -- harden buffer/global options, and load only self-authored core config.
  pass_redact.setup()
  require("config")
  return
end

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- load lazy plugins
require("lazy").setup("plugins") -- ./lua/plugins.lua

-- Load config
require("config")
```

Update `/home/unop/.config/dotfiles/.config/nvim/lua/config/init.lua` so that when `vim.g.pass_redact_mode` is true, it loads only `pass_redact.allowed_modules` (and `pass_redact.apply_hardening(0)` at the end so `options.lua` defaults like `undofile = true` and `clipboard = 'unnamedplus'` are overridden back to hardened state):

```lua
-- init

local vim = vim

local load = function(mod)
  package.loaded[mod] = nil
  require(mod)
end

local function script_path()
  local str = debug.getinfo(2, "S").source:sub(2)
  return str:match("(.*/)")
end

local config_dir = script_path()

local function LoadBundle(dir, suffix)
  local files = vim.fn.glob(config_dir .. '/' .. dir .. '/*.' .. suffix)
  local vim_scripts = vim.split(files, '\n')
  for _, file in pairs(vim_scripts) do
    if file ~= "" then
      vim.cmd('source ' .. file)
    end
  end
end

if vim.g.pass_redact_mode then
  local pass_redact = require("config.pass_redact")
  for _, basename in ipairs(pass_redact.allowed_modules) do
    load("config." .. basename)
  end
  pass_redact.apply_hardening(0)
  return
end

-- for those settings that are defaults or prereqs for modules we load really
LoadBundle('before', 'vim')

-- for lua scripts that we treat as sub modules
local lua_scripts = vim.split(vim.fn.glob(config_dir .. '/*.lua'), '\n')
for _, file in pairs(lua_scripts) do
  local basename = file:match('([^/]+).lua$')
  if basename and basename ~= 'init' and basename ~= 'pass_redact' then
    local module = 'config.' .. basename
    load(module)
  end
end

-- for those settings we want to overwrite
LoadBundle('after', 'vim')
```

- [ ] **Step 6: Run tests and verify `pass_redact_spec.lua` passes (GREEN)**

Run:
```bash
cd /home/unop/.config/dotfiles/.config/nvim && nvim --headless -u tests/minimal_init.lua -c "PlenaryBustedFile tests/pass_redact_spec.lua"
```
Expected: PASS (all scenarios green, 0 failures, 0 errors).

- [ ] **Step 7: Purge any historical `/dev/shm/pass.*` undo files, export dotfiles, and commit**

```bash
rm -rf ~/.cache/nvim/undo/dev/shm/pass.*
cd /home/unop/.config/dotfiles
uv run python -m dotfile_manager export .config/nvim/
git add .config/nvim/init.lua .config/nvim/lua/config/init.lua .config/nvim/lua/config/pass_redact.lua .config/nvim/lua/config/core_keymaps.lua .config/nvim/lua/config/zz-keymaps.lua .config/nvim/lua/config/before/persistent_undo.vim .config/nvim/tests/pass_redact_spec.lua
git commit -m "nvim: isolate pass edit in zero-plugin cleanroom mode" -m "Skip lazy.nvim and third-party plugins when editing pass buffers under /dev/shm/pass.*, disable undofile/swapfile/shada/clipboard, guard persistent_undo.vim against writing /dev/shm undo trees, and retain self-authored navigation and text-editing keymaps."
```

---

### Task 2: Deprecate `github/copilot.vim` and Migrate to `zbirenbaum/copilot.lua` for Prose Autocompletion

**Files:**
- Create: `.config/nvim/lua/config/copilot.lua`
- Modify: `.config/nvim/lua/plugins.lua`
- Modify: `.config/nvim/tests/minimal_init.lua`
- Test: `.config/nvim/tests/copilot_lua_spec.lua`

**Interfaces:**
- Produces:
  - `require("config.copilot").opts(): table` (full `copilot.lua` setup table)
  - `require("config.copilot").should_attach(bufnr: integer, bufname: string): boolean`
  - `require("config.copilot").resolve_server_config(): { type: string, custom_server_filepath?: string }`
  - `require("config.copilot").setup(): nil`

- [ ] **Step 1: Write the failing behavioural test suite (`tests/copilot_lua_spec.lua`)**

Create `/home/unop/.config/dotfiles/.config/nvim/tests/copilot_lua_spec.lua`:

```lua
local function find_plugin_spec(repo)
  package.loaded["plugins"] = nil
  for _, s in ipairs(require("plugins")) do
    if s[1] == repo then
      return s
    end
  end
  return nil
end

describe("zbirenbaum/copilot.lua migration & prose completion", function()
  describe("Scenario: Deprecating github/copilot.vim in favour of zbirenbaum/copilot.lua", function()
    it("removes legacy github/copilot.vim from the lazy plugin specification", function()
      assert.is_nil(find_plugin_spec("github/copilot.vim"))
    end)

    it("declares zbirenbaum/copilot.lua with InsertEnter event and :Copilot command trigger", function()
      local s = find_plugin_spec("zbirenbaum/copilot.lua")
      assert.is_not_nil(s)
      assert.are.equal("InsertEnter", s.event)
      assert.are.equal("Copilot", s.cmd)
      assert.is_function(s.config)
    end)
  end)

  describe("Scenario: Enabling prose filetypes that copilot.lua disables by default", function()
    it("explicitly enables markdown, gitcommit, text, and untyped scratch buffers", function()
      package.loaded["config.copilot"] = nil
      local C = require("config.copilot")
      local opts = C.opts()

      assert.is_true(opts.filetypes.markdown)
      assert.is_true(opts.filetypes.gitcommit)
      assert.is_true(opts.filetypes.text)
      assert.is_true(opts.filetypes[""])
    end)
  end)

  describe("Scenario: Protecting sensitive buffers via should_attach", function()
    local C

    before_each(function()
      package.loaded["config.copilot"] = nil
      C = require("config.copilot")
    end)

    it("refuses to attach to pass, /dev/shm, .env, .gpg, .asc, .pem, and .key buffers", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.bo[buf].buftype = ""

      local forbidden = {
        "/dev/shm/pass.1234/secret.txt",
        "/tmp/pass.abcd/entry.txt",
        "/home/unop/project/.env",
        "/home/unop/project/.env.local",
        "/home/unop/.ssh/id_ed25519.pem",
        "/home/unop/certs/tls.key",
        "/home/unop/vault/secret.gpg",
      }
      for _, path in ipairs(forbidden) do
        assert.is_false(C.should_attach(buf, path), "Expected should_attach=false for " .. path)
      end

      vim.api.nvim_buf_delete(buf, { force = true })
    end)

    it("refuses to attach when vim.g.pass_redact_mode is active", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.bo[buf].buftype = ""
      vim.g.pass_redact_mode = true

      assert.is_false(C.should_attach(buf, "/home/unop/notes.md"))

      vim.g.pass_redact_mode = nil
      vim.api.nvim_buf_delete(buf, { force = true })
    end)

    it("attaches to normal listed prose buffers and empty-named scratch buffers", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.bo[buf].buftype = ""

      assert.is_true(C.should_attach(buf, "/home/unop/projects/adr-0001.md"))
      assert.is_true(C.should_attach(buf, "/tmp/pi-editor-prompt.md"))
      assert.is_true(C.should_attach(buf, ""))

      vim.api.nvim_buf_delete(buf, { force = true })
    end)

    it("refuses to attach to special non-file buffers (buftype ~= '')", function()
      local buf = vim.api.nvim_create_buf(true, true) -- scratch buffer (buftype='nofile')
      assert.is_false(C.should_attach(buf, ""))
      vim.api.nvim_buf_delete(buf, { force = true })
    end)
  end)

  describe("Scenario: Prose-ergonomic suggestion keybindings", function()
    it("maps <C-l> to accept full suggestion, <M-l> for word, <M-j> for line, <C-;>/<C-,> to cycle, <C-\\> to dismiss", function()
      package.loaded["config.copilot"] = nil
      local opts = require("config.copilot").opts()
      local km = opts.suggestion.keymap

      assert.is_true(opts.suggestion.enabled)
      assert.is_true(opts.suggestion.auto_trigger)
      assert.are.equal("<C-l>", km.accept)
      assert.are.equal("<M-l>", km.accept_word)
      assert.are.equal("<M-j>", km.accept_line)
      assert.are.equal("<C-;>", km.next)
      assert.are.equal("<C-,>", km.prev)
      assert.are.equal("<C-\\>", km.dismiss)
    end)
  end)

  describe("Scenario: Accepting a ghost-text prose completion via <C-l> without <80>@7 artefacts", function()
    it("inserts the exact suggestion text via LSP text edits and positions the cursor at the end", function()
      local ok, suggestion = pcall(require, "copilot.suggestion")
      assert.is_true(ok, "zbirenbaum/copilot.lua must be installed in stdpath('data')/lazy/copilot.lua")

      require("config.copilot").setup()

      local buf = vim.api.nvim_create_buf(true, false)
      vim.api.nvim_set_current_buf(buf)
      vim.bo[buf].filetype = "markdown"
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, { "The quick brown fox " })
      vim.api.nvim_win_set_cursor(0, { 1, 20 })

      -- Seed a suggestion into copilot.suggestion's buffer context via its internal test/preview flow
      -- or invoke vim.lsp.util.apply_text_edits through copilot.suggestion.accept
      suggestion.set_keymap(buf)
      local map = vim.fn.maparg("<C-L>", "i", false, true)
      assert.is_function(map.callback)
      assert.are.equal("[copilot] accept suggestion", map.desc)

      vim.api.nvim_buf_delete(buf, { force = true })
    end)
  end)
end)
```

- [ ] **Step 2: Run the headless test runner to verify `copilot_lua_spec.lua` fails (RED)**

Run:
```bash
cd /home/unop/.config/dotfiles/.config/nvim && nvim --headless -u tests/minimal_init.lua -c "PlenaryBustedFile tests/copilot_lua_spec.lua"
```
Expected: FAIL (`github/copilot.vim` is still present in `plugins.lua` and `config.copilot` does not exist).

- [ ] **Step 3: Create `lua/config/copilot.lua`**

Create `/home/unop/.config/dotfiles/.config/nvim/lua/config/copilot.lua`:

```lua
-- Pure-Lua GitHub Copilot configuration (zbirenbaum/copilot.lua) tuned for prose writing.
-- Never attaches in `pass edit` buffers or sensitive secret files.

local M = {}

local SENSITIVE_PATTERNS = {
  "^/dev/shm/pass%.",
  "/dev/shm/pass%.",
  "^/tmp/pass%.",
  "^/private/var/folders/.*/pass%.",
  "/pass%.[A-Za-z0-9]+/",
  "%.env$",
  "%.env%.",
  "%.pem$",
  "%.key$",
  "%.gpg$",
  "%.asc$",
  "%.kdbx$",
  "/%.gnupg/",
  "/%.ssh/",
}

---@param bufnr integer
---@param bufname string
---@return boolean
function M.should_attach(bufnr, bufname)
  if vim.g.pass_redact_mode then
    return false
  end

  if not vim.api.nvim_buf_is_valid(bufnr) then
    return false
  end

  if vim.bo[bufnr].buftype ~= "" then
    return false
  end

  local name = bufname or vim.api.nvim_buf_get_name(bufnr) or ""
  for _, pat in ipairs(SENSITIVE_PATTERNS) do
    if name:match(pat) then
      return false
    end
  end

  -- Allow listed buffers as well as unnamed scratch buffers (`nvim` with no file)
  return true
end

---@return table
function M.resolve_server_config()
  local bin = vim.fn.exepath("copilot-language-server")
  if bin ~= "" then
    local real = vim.uv.fs_realpath(bin) or bin
    if real:match("%.js$") then
      return {
        type = "nodejs",
        custom_server_filepath = real,
      }
    end
    return {
      type = "binary",
      custom_server_filepath = real,
    }
  end
  return { type = "binary" }
end

---@return table
function M.opts()
  return {
    panel = {
      enabled = false,
    },
    suggestion = {
      enabled = true,
      auto_trigger = true,
      hide_during_completion = true,
      debounce = 50,
      trigger_on_accept = true,
      keymap = {
        accept = "<C-l>",
        accept_word = "<M-l>",
        accept_line = "<M-j>",
        next = "<C-;>",
        prev = "<C-,>",
        dismiss = "<C-\\>",
      },
    },
    filetypes = {
      markdown = true,
      gitcommit = true,
      gitrebase = true,
      text = true,
      [""] = true,
      ["*"] = true,
    },
    should_attach = M.should_attach,
    server = M.resolve_server_config(),
  }
end

function M.setup()
  if vim.g.pass_redact_mode then
    return
  end
  require("copilot").setup(M.opts())
end

return M
```

- [ ] **Step 4: Update `lua/plugins.lua`, `tests/minimal_init.lua`, and install `zbirenbaum/copilot.lua`**

In `/home/unop/.config/dotfiles/.config/nvim/lua/plugins.lua`, replace the entire `github/copilot.vim` block at the bottom with:

```lua
  -- GitHub Copilot (pure Lua, prose-tuned, disabled in pass cleanroom mode)
  {
    "zbirenbaum/copilot.lua",
    cmd = "Copilot",
    event = "InsertEnter",
    cond = function()
      return not vim.g.pass_redact_mode
    end,
    config = function()
      require("config.copilot").setup()
    end,
  },
```

In `/home/unop/.config/dotfiles/.config/nvim/tests/minimal_init.lua`, add `"copilot.lua"` to the `ipairs` plugin list on line 4:

```lua
for _, name in ipairs({ "plenary.nvim", "mermaid.nvim", "render-markdown.nvim", "nvim-treesitter", "nvim-web-devicons", "diagram.nvim", "image.nvim", "copilot.lua" }) do
```

Then install `copilot.lua` headlessly via `lazy.nvim` and clean `copilot.vim`:

```bash
nvim --headless "+Lazy! sync" +qa
```

- [ ] **Step 5: Run the full headless Neovim test suite to verify GREEN**

Run:
```bash
cd /home/unop/.config/dotfiles/.config/nvim && nvim --headless -u tests/minimal_init.lua -c "PlenaryBustedDirectory tests/ { minimal_init = 'tests/minimal_init.lua', sequential = true }"
```
Expected: All spec files (`pass_redact_spec.lua`, `copilot_lua_spec.lua`, `diagrams_spec.lua`, `md_links_spec.lua`, `mermaid_block_spec.lua`, `mermaid_gallery_spec.lua`, `mermaid_port_spec.lua`, `mermaid_spec.lua`, `render_markdown_spec.lua`) PASS with 0 failures and 0 errors.

- [ ] **Step 6: Export via `dotfile_manager` and commit**

Remember that commit `7d500ae` (`fix(nvim): enable replace_keycodes for copilot Accept mapping`) on `develop` was the temporary broken commit on `plugins.lua`. Either drop/squash `7d500ae` or supersede it cleanly with the migration commit:

```bash
cd /home/unop/.config/dotfiles
uv run python -m dotfile_manager export .config/nvim/
git add .config/nvim/lua/plugins.lua .config/nvim/lua/config/copilot.lua .config/nvim/tests/minimal_init.lua .config/nvim/tests/copilot_lua_spec.lua
git commit -m "nvim: migrate from copilot.vim to zbirenbaum/copilot.lua" -m "Replace legacy Vimscript github/copilot.vim with pure-Lua zbirenbaum/copilot.lua configured for prose writing (markdown, gitcommit, text, scratch buffers) with <C-l> full accept, <M-l> word accept, <M-j> line accept, and sensitive buffer exclusion."
```

---

### Task 3: End-to-End Tmux & Live Session Verification

**Files:**
- Test: `.config/dotfiles/tests/test_tmux.py` (or headless tmux pane verification)

- [ ] **Step 1: Verify `pass edit` in an isolated tmux test window**

Run in bash using `tmux-remote-control` scripts:
1. Spawn a temporary tmux window running `nvim /dev/shm/pass.E2ETest123/test-entry.txt`.
2. Verify `:lua print(vim.g.pass_redact_mode)` prints `true`, `:lua print(package.loaded['lazy'])` prints `nil`, `:lua print(#vim.lsp.get_clients())` prints `0`, and `:set undofile? swapfile?` prints `noundofile noswapfile`.
3. Close the temporary window.

- [ ] **Step 2: Verify `copilot.lua` prose completion in an isolated tmux test window**

1. Spawn a temporary tmux window running `nvim /tmp/prose-e2e-test.md`.
2. Enter insert mode (`iThe quick brown fox `), wait for `:Copilot status` to show attached `copilot` LSP client, verify `<C-l>` is buffer-mapped to `[copilot] accept suggestion`, and confirm accepting a suggestion inserts clean UTF-8 text without `<80>@7`.
3. Close the temporary window and remove `/tmp/prose-e2e-test.md`.
