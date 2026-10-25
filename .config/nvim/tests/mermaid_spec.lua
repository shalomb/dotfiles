-- Behavioural tests for the mermaid.nvim integration (lua/plugins.lua spec).
local function spec()
  package.loaded["plugins"] = nil
  for _, s in ipairs(require("plugins")) do
    if s[1] == "kevalin/mermaid.nvim" then return s end
  end
end

describe("mermaid.nvim integration", function()
  it("is declared in the lazy plugin spec", function()
    assert.is_not_nil(spec())
  end)

  it("is installed and loadable", function()
    assert.is_true(pcall(require, "mermaid"))
  end)

  it("detects .mmd files as mermaid", function()
    vim.cmd("enew")
    vim.cmd("file diagram.mmd")
    vim.cmd("filetype detect")
    assert.are.equal("mermaid", vim.bo.filetype)
  end)

  it("registers user commands after setup", function()
    local s = spec()
    require("mermaid").setup({ lint = { enabled = false } })
    for _, c in ipairs({ "MermaidPreview", "MermaidFormat", "MermaidRender" }) do
      assert.are.equal(2, vim.fn.exists(":" .. c), c .. " missing")
    end
    assert.is_function(s.config)
  end)

  it("formats a flowchart", function()
    require("mermaid").setup({ format = { shift_width = 2 }, lint = { enabled = false } })
    vim.o.shiftwidth = 2
    local buf = vim.api.nvim_create_buf(false, true)
    vim.api.nvim_set_current_buf(buf)
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, { "flowchart TD", "subgraph A", "X-->Y", "end" })
    vim.cmd("MermaidFormat")
    local out = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
    assert.are.equal("    X --> Y", out[3]) -- header > subgraph > node
  end)

  it("maps buffer-local keys on mermaid filetype via the spec config", function()
    local s = spec()
    s.config()
    local buf = vim.api.nvim_create_buf(false, true)
    vim.api.nvim_set_current_buf(buf)
    vim.bo[buf].filetype = "mermaid"
    local map = vim.fn.maparg(" mp", "n", false, true)
    assert.are.equal("<Cmd>MermaidPreview<CR>", map.rhs)
    assert.are.equal(1, map.buffer)
  end)
end)
