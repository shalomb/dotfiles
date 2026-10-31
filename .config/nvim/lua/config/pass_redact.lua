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
