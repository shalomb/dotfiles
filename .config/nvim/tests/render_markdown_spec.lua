local function spec()
  package.loaded["plugins"] = nil
  for _, s in ipairs(require("plugins")) do
    if s[1] == "MeanderingProgrammer/render-markdown.nvim" then return s end
  end
end

describe("render-markdown.nvim integration", function()
  it("is declared in the lazy plugin spec for markdown", function()
    local s = spec()
    assert.is_not_nil(s)
    assert.are.same({ "markdown" }, s.ft)
  end)

  it("is installed and loadable", function()
    assert.is_true(pcall(require, "render-markdown"))
  end)

  it("can be set up and enabled on a markdown buffer", function()
    require("render-markdown").setup({})
    vim.cmd("edit " .. vim.fn.getcwd() .. "/tests/fixtures/multi.md")
    vim.bo.filetype = "markdown"
    assert.is_true(pcall(vim.cmd, "RenderMarkdown enable"))
  end)
end)

describe("render-markdown stale tree after J", function()
  it("get_node_text on a stale node does not throw once configured", function()
    local s = spec()
    s.config(s, s.opts)
    local buf = vim.api.nvim_create_buf(false, true)
    vim.api.nvim_set_current_buf(buf)
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, { "# a", "", "some text here", "more text there" })
    local parser = vim.treesitter.get_parser(buf, "markdown")
    local root = parser:parse()[1]:root()
    local node = root:child(root:child_count() - 1)
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, { "x" }) -- buffer shrinks; tree is stale
    local ok, res = pcall(vim.treesitter.get_node_text, node, buf)
    assert.is_true(ok)
    assert.are.equal("", res)
  end)
end)
