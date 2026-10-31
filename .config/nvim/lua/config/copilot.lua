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
