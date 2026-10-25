local blk = require("config.mermaid_block")
local function fixture()
  return vim.fn.readfile(vim.fn.getcwd() .. "/tests/fixtures/multi.md")
end

describe("mermaid gallery", function()
  it("extracts every mermaid block, skipping other fences", function()
    local b = blk.blocks(fixture())
    assert.are.equal(3, #b)
    assert.are.equal("flowchart TD", b[1].lines[1])
    assert.are.equal("classDiagram", b[2].lines[2])
    assert.are.equal("pie", b[3].lines[1])
  end)

  it("titles each block with the nearest preceding heading", function()
    local b = blk.blocks(fixture())
    assert.are.equal("2. Lifecycle", b[1].title)
    assert.are.equal("Spec 1: Contract", b[2].title)
    assert.are.equal("Appendix", b[3].title)
  end)

  it("ignores '#' lines inside other fences when finding titles", function()
    for _, x in ipairs(blk.blocks(fixture())) do
      assert.is_nil(x.title:match("Fake heading"))
    end
  end)

  it("records the 1-based fence line of each block", function()
    local b = blk.blocks(fixture())
    assert.are.equal("```mermaid", fixture()[b[1].line])
  end)

  it("serves block data as JSON with the active block flagged", function()
    blk.state.blocks = blk.blocks(fixture())
    blk.state.active = 2
    blk.state.dark = true
    local status, body, ctype = blk.handle("/data")
    assert.are.equal(200, status)
    assert.truthy(ctype:match("json"))
    local d = vim.json.decode(body)
    assert.are.equal(3, #d.blocks)
    assert.are.equal(2, d.active)
    assert.is_true(d.dark)
    assert.are.equal("Appendix", d.blocks[3].title)
  end)

  it("serves an HTML page that polls /data and renders with mermaid", function()
    local status, body, ctype = blk.handle("/")
    assert.are.equal(200, status)
    assert.truthy(ctype:match("html"))
    assert.truthy(body:match("/data"))
    assert.truthy(body:match("mermaid"))
  end)

  it("404s unknown paths", function()
    assert.are.equal(404, (blk.handle("/nope")))
  end)

  it("keeps single-block extraction working", function()
    assert.are.same({ "pie", '  "a": 1' }, blk.extract(fixture(), 30))
  end)
end)
