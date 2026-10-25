-- Multi-diagram mermaid preview for markdown buffers.
--
-- kevalin/mermaid.nvim sends the whole buffer to mermaid.js as ONE diagram, so
-- a markdown file fails with UnknownDiagramError. In markdown buffers we
-- shadow :MermaidPreview with a "gallery": a tiny local HTTP server serving a
-- page that renders every ```mermaid fence in the buffer, stacked and titled by
-- the nearest preceding heading. It polls /data, so edits show up live and the
-- block under the cursor is highlighted/scrolled to.
local M = {}

M.state = { blocks = {}, active = 0, dark = false, bufnr = nil }
M.server = nil
M.port = nil

--- Parse markdown into mermaid blocks.
--- @return {title:string, lines:string[], line:integer, last:integer}[]
function M.blocks(lines)
  local out, fence, title = {}, nil, ""
  for i, l in ipairs(lines) do
    if fence then
      local close = l:match("^%s*([`~]+)%s*$")
      if close and close:sub(1, 1) == fence.ch and #close >= fence.len then
        if fence.mermaid then
          out[#out + 1] = {
            title = fence.title,
            lines = vim.list_slice(lines, fence.line + 1, i - 1),
            line = fence.line,
            last = i,
          }
        end
        fence = nil
      end
    else
      local ticks, info = l:match("^%s*([`~][`~][`~]+)%s*(.*)$")
      if ticks then
        fence = {
          ch = ticks:sub(1, 1), len = #ticks, line = i, title = title,
          mermaid = info:match("^mermaid") ~= nil,
        }
      else
        local h = l:match("^#+%s+(.-)%s*$")
        if h then title = h end
      end
    end
  end
  return out
end

--- Lines of the block containing lnum, else the next one below, else nil.
function M.extract(lines, lnum)
  local bs = M.blocks(lines)
  for _, b in ipairs(bs) do
    if lnum >= b.line and lnum <= b.last then return b.lines end
  end
  for _, b in ipairs(bs) do
    if b.line > lnum then return b.lines end
  end
  return nil
end

local function active_index(blocks, lnum)
  local idx = 0
  for i, b in ipairs(blocks) do
    if b.line <= lnum then idx = i end
  end
  return idx
end

local PAGE = [[<!doctype html><html><head><meta charset="utf-8"><title>Mermaid gallery</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:1rem 2rem;background:#fff;color:#222}
body.dark{background:#1e1e1e;color:#ddd}
section{border:2px solid transparent;border-radius:6px;padding:.5rem 1rem;margin:1rem 0}
section.active{border-color:#d79921}
h3{margin:.2rem 0;font-size:1rem;opacity:.8}
.err{color:#c00;white-space:pre-wrap;font-family:monospace}
.diagram{overflow:auto}
</style></head><body><div id="root">loading…</div>
<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
let last = "", lastActive = -1, n = 0;
async function tick() {
  try {
    const raw = await (await fetch("/data")).text();
    if (raw !== last) {
      const d = JSON.parse(raw);
      const prevBlocks = JSON.stringify(d.blocks);
      const needRender = !last || JSON.stringify(JSON.parse(last).blocks) !== prevBlocks
        || JSON.parse(last).dark !== d.dark;
      last = raw;
      document.body.classList.toggle("dark", d.dark);
      if (needRender) {
        mermaid.initialize({ startOnLoad: false, theme: d.dark ? "dark" : "default" });
        const root = document.getElementById("root");
        root.innerHTML = "";
        for (const [i, b] of d.blocks.entries()) {
          const s = document.createElement("section");
          s.id = "b" + (i + 1);
          s.innerHTML = "<h3></h3><div class='diagram'></div>";
          s.querySelector("h3").textContent = (i + 1) + ". " + b.title;
          root.appendChild(s);
          try {
            const { svg } = await mermaid.render("m" + (++n), b.code);
            s.querySelector(".diagram").innerHTML = svg;
          } catch (e) {
            s.querySelector(".diagram").innerHTML = "<div class='err'></div>";
            s.querySelector(".err").textContent = String(e.message || e);
          }
        }
        if (!d.blocks.length) root.textContent = "No ```mermaid blocks in buffer";
        lastActive = -1;
      }
      document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
      const a = document.getElementById("b" + d.active);
      if (a) {
        a.classList.add("active");
        if (d.active !== lastActive) a.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      lastActive = d.active;
    }
  } catch (e) {}
  setTimeout(tick, 700);
}
tick();
</script></body></html>]]

--- Pure request router: path -> status, body, content-type
function M.handle(path)
  if path == "/" then
    return 200, PAGE, "text/html; charset=utf-8"
  elseif path == "/data" then
    local blocks = {}
    for _, b in ipairs(M.state.blocks) do
      blocks[#blocks + 1] = { title = b.title, code = table.concat(b.lines, "\n") }
    end
    local body = vim.json.encode({
      blocks = blocks, active = M.state.active, dark = M.state.dark,
    })
    return 200, body, "application/json"
  end
  return 404, "Not Found", "text/plain"
end

local REASONS = { [200] = "OK", [404] = "Not Found" }

--- Fixed port so an SSH/VM tunnel never needs changing. Override with
--- `vim.g.mermaid_port`. Shared with mermaid.nvim's own preview (plugins.lua).
function M.configured_port()
  return vim.g.mermaid_port or 8765
end

--- @return integer|nil port, string|nil err
function M.start_server()
  if M.server then return M.port end
  local port = M.configured_port()
  local srv = vim.uv.new_tcp()
  -- 0.0.0.0 so a forwarded/tunnelled connection from outside the VM works
  local ok, berr = srv:bind("0.0.0.0", port)
  if not ok then
    srv:close()
    return nil, ("port %d unavailable: %s"):format(port, tostring(berr))
  end
  local lok, lerr = srv:listen(16, function(err)
    if err then return end
    local c = vim.uv.new_tcp()
    srv:accept(c)
    c:read_start(function(rerr, chunk)
      if rerr or not chunk then
        if not c:is_closing() then c:close() end
        return
      end
      local path = chunk:match("^GET%s+(%S+)") or "/"
      path = path:gsub("%?.*$", "")
      local status, body, ctype = M.handle(path)
      c:write(("HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %d\r\n"
        .. "Cache-Control: no-store\r\nConnection: close\r\n\r\n%s")
        :format(status, REASONS[status] or "", ctype, #body, body), function()
        if not c:is_closing() then c:close() end
      end)
    end)
  end)
  if not lok then
    srv:close()
    return nil, ("port %d unavailable: %s"):format(port, tostring(lerr))
  end
  M.server, M.port = srv, srv:getsockname().port
  return M.port
end

function M.stop()
  if M.server then
    M.server:close()
    M.server, M.port = nil, nil
  end
  pcall(vim.api.nvim_del_augroup_by_name, "MermaidGallery")
end

local function refresh()
  local buf = M.state.bufnr
  if not buf or not vim.api.nvim_buf_is_valid(buf) then return end
  M.state.blocks = M.blocks(vim.api.nvim_buf_get_lines(buf, 0, -1, false))
  M.state.dark = vim.o.background == "dark"
  local win = vim.fn.bufwinid(buf)
  local lnum = win ~= -1 and vim.api.nvim_win_get_cursor(win)[1] or 1
  M.state.active = active_index(M.state.blocks, lnum)
end

function M.preview()
  M.state.bufnr = vim.api.nvim_get_current_buf()
  refresh()
  local port, err = M.start_server()
  if not port then
    return vim.notify("Mermaid gallery: " .. err, vim.log.levels.ERROR)
  end
  local g = vim.api.nvim_create_augroup("MermaidGallery", { clear = true })
  vim.api.nvim_create_autocmd(
    { "TextChanged", "TextChangedI", "BufWritePost", "CursorMoved", "CursorMovedI" },
    { group = g, buffer = M.state.bufnr, callback = refresh })
  vim.api.nvim_create_autocmd("VimLeavePre", { group = g, callback = M.stop })
  local url = "http://localhost:" .. port
  vim.notify(("Mermaid gallery: %d diagram(s) at %s"):format(#M.state.blocks, url))
  if vim.ui.open then vim.ui.open(url) end
end

vim.api.nvim_create_user_command("MermaidGallery", M.preview, {})
vim.api.nvim_create_user_command("MermaidGalleryStop", M.stop, {})
vim.api.nvim_create_user_command("MermaidPreviewBlock", M.preview, {}) -- legacy alias
vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function(ev)
    -- buffer-local command shadows the plugin's whole-buffer :MermaidPreview
    vim.api.nvim_buf_create_user_command(ev.buf, "MermaidPreview", M.preview, {})
    vim.api.nvim_buf_create_user_command(ev.buf, "MermaidPreviewStop", M.stop, {})
    vim.keymap.set("n", "<leader>mp", M.preview, { buffer = ev.buf, desc = "Mermaid gallery" })
    vim.keymap.set("n", "<leader>mx", M.stop, { buffer = ev.buf, desc = "Mermaid gallery stop" })
  end,
})

return M
