-- <CR> in markdown: follow links.
--   [t](other.md#anchor)  -> open file in nvim, jump to heading/<a id> anchor
--   [t](#anchor)          -> jump within the buffer (GitHub slug rules)
--   [t](https://...)      -> vim.ui.open
-- Replaces jghauser/follow-md-links.nvim, which requires the removed
-- `nvim-treesitter.ts_utils` (nvim-treesitter `main` rewrite) and so errors.
local M = {}

--- GitHub-style heading slug.
function M.slug(text)
  local s = text:lower():gsub("[^%w%s_%-]", ""):gsub("%s", "-")
  return s
end

--- URL of the [text](url) link covering 1-based col, else nil.
function M.link_at(line, col)
  local init = 1
  while true do
    local s, e, url = line:find("%b[]%(([^)]*)%)", init)
    if not s then return nil end
    if col >= s and col <= e then
      return (url:gsub("%s+[\"'].*$", ""):gsub("^<(.*)>$", "%1"))
    end
    init = e + 1
  end
end

--- @return table {kind="web"|"anchor"|"file", ...}
function M.resolve(target, bufpath)
  if target:match("^%a[%w+.-]*://") or target:match("^mailto:") then
    return { kind = "web", url = target }
  end
  local path, anchor = target:match("^([^#]*)#?(.*)$")
  anchor = anchor ~= "" and anchor or nil
  if path == "" then return { kind = "anchor", anchor = anchor } end
  if path:sub(1, 1) == "~" then path = vim.fn.expand(path) end
  if path:sub(1, 1) ~= "/" then path = vim.fs.dirname(bufpath) .. "/" .. path end
  return { kind = "file", path = vim.fs.normalize(path), anchor = anchor }
end

--- 1-based line of the heading/<a id> matching anchor, skipping code fences.
function M.find_anchor(lines, anchor)
  local fence, seen = nil, {}
  for i, l in ipairs(lines) do
    local f = l:match("^%s*([`~][`~][`~]+)")
    if fence then
      if f and f:sub(1, 1) == fence then fence = nil end
    elseif f then
      fence = f:sub(1, 1)
    else
      local id = l:match('<a%s+id="([^"]+)"') or l:match("<a%s+name=\"([^\"]+)\"")
      if id == anchor then return i end
      local h = l:match("^#+%s+(.-)%s*#*%s*$")
      if h then
        local slug = M.slug(h)
        local n = seen[slug] or 0
        seen[slug] = n + 1
        if (n == 0 and slug or (slug .. "-" .. n)) == anchor then return i end
      end
    end
  end
end

local function jump(anchor)
  if not anchor then return end
  local ln = M.find_anchor(vim.api.nvim_buf_get_lines(0, 0, -1, false), anchor)
  if ln then
    vim.cmd("normal! m'")
    vim.api.nvim_win_set_cursor(0, { ln, 0 })
    vim.cmd("normal! zz")
  else
    vim.notify("Anchor not found: #" .. anchor, vim.log.levels.WARN)
  end
end

--- @return boolean handled
function M.follow()
  local col = vim.api.nvim_win_get_cursor(0)[2] + 1
  local target = M.link_at(vim.api.nvim_get_current_line(), col)
  if not target then return false end
  local r = M.resolve(target, vim.api.nvim_buf_get_name(0))
  if r.kind == "web" then
    vim.ui.open(r.url)
  elseif r.kind == "anchor" then
    jump(r.anchor)
  else
    if vim.uv.fs_stat(r.path) then
      vim.cmd("edit " .. vim.fn.fnameescape(r.path))
      jump(r.anchor)
    else
      vim.notify("File not found: " .. target, vim.log.levels.WARN)
    end
  end
  return true
end

vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function(ev)
    vim.keymap.set("n", "<CR>", function()
      if not M.follow() then
        vim.api.nvim_feedkeys(vim.keycode("<CR>"), "n", false)
      end
    end, { buffer = ev.buf, desc = "Follow markdown link" })
    vim.keymap.set("n", "<BS>", "<C-o>", { buffer = ev.buf, desc = "Back (after following a link)" })
  end,
})

return M
