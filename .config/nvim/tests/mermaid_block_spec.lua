local blk = require("config.mermaid_block")

describe("mermaid fenced-block extraction", function()
  local md = {
    "# t", "```mermaid", "flowchart TD", "  A --> B", "```", "text",
    "```mermaid", "pie", '  "a": 1', "```",
  }
  it("returns the block containing the cursor line", function()
    assert.are.same({ "flowchart TD", "  A --> B" }, blk.extract(md, 4))
    assert.are.same({ "pie", '  "a": 1' }, blk.extract(md, 9))
  end)
  it("falls back to the next block below when outside any", function()
    assert.are.same({ "pie", '  "a": 1' }, blk.extract(md, 6))
  end)
  it("returns nil when there is no block", function()
    assert.is_nil(blk.extract({ "hello" }, 1))
  end)
end)

describe("markdown buffers", function()
  it("override :MermaidPreview with a buffer-local block-aware command", function()
    vim.cmd("enew")
    vim.bo.filetype = "markdown"
    local cmds = vim.api.nvim_buf_get_commands(0, {})
    assert.is_not_nil(cmds.MermaidPreview)
  end)
end)
