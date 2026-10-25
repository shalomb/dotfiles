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
