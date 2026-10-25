-- :MermaidPreviewBlock -- preview the ```mermaid fence under (or after) the
-- cursor. kevalin/mermaid.nvim sends the whole buffer to mermaid.js, so a
-- markdown file fails with UnknownDiagramError; we hand it a scratch buffer.
local M = {}

--- @param lines string[]
--- @param lnum integer 1-based cursor line
--- @return string[]|nil
function M.extract(lines, lnum)
  local blocks, start = {}, nil
  for i, l in ipairs(lines) do
    if not start and l:match("^%s*```%s*mermaid") then
      start = i
    elseif start and l:match("^%s*```%s*$") then
      blocks[#blocks + 1] = { start, i }
      start = nil
    end
  end
  for _, b in ipairs(blocks) do
    if lnum >= b[1] and lnum <= b[2] then return vim.list_slice(lines, b[1] + 1, b[2] - 1) end
  end
  for _, b in ipairs(blocks) do
    if b[1] > lnum then return vim.list_slice(lines, b[1] + 1, b[2] - 1) end
  end
  return nil
end

function M.preview()
  local src = vim.api.nvim_get_current_buf()
  local block = M.extract(vim.api.nvim_buf_get_lines(src, 0, -1, false), vim.fn.line("."))
  if not block then
    return vim.notify("No ```mermaid block found", vim.log.levels.WARN)
  end
  vim.cmd("vnew")
  local buf = vim.api.nvim_get_current_buf()
  vim.bo[buf].buftype, vim.bo[buf].bufhidden, vim.bo[buf].swapfile = "nofile", "wipe", false
  vim.bo[buf].filetype = "mermaid"
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, block)
  require("lazy").load({ plugins = { "mermaid.nvim" } })
  vim.cmd("MermaidPreview") -- scratch buffer is ft=mermaid: global command
end

vim.api.nvim_create_user_command("MermaidPreviewBlock", M.preview, {})
vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function(ev)
    -- buffer-local command shadows the plugin's whole-buffer :MermaidPreview
    vim.api.nvim_buf_create_user_command(ev.buf, "MermaidPreview", M.preview, {})
    vim.keymap.set("n", "<leader>mp", M.preview, { buffer = ev.buf, desc = "Mermaid preview block" })
  end,
})

return M
