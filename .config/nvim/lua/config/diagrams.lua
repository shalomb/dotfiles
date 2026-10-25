-- Helpers for inline diagram rendering (3rd/diagram.nvim -> mmdc -> image.nvim).
-- mmdc drives puppeteer; on this ARM VM it needs --no-sandbox and the cached
-- chrome-headless-shell, which we point it at via a generated config file.
local M = {}

--- @param cache_root string|nil puppeteer cache dir
--- @return string[] cli_args for mmdc
function M.puppeteer_args(cache_root)
  cache_root = cache_root or (vim.env.HOME .. "/.cache/puppeteer")
  local found = vim.fn.glob(cache_root .. "/chrome-headless-shell/*/*/chrome-headless-shell", false, true)
  table.sort(found)
  local cfg = { args = { "--no-sandbox" } }
  if #found > 0 then cfg.executablePath = found[#found] end
  local path = vim.fn.tempname() .. "-puppeteer.json"
  vim.fn.writefile({ vim.json.encode(cfg) }, path)
  return { "-p", path }
end

return M
