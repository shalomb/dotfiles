local blk = require("config.mermaid_block")

local function free_port()
  local t = vim.uv.new_tcp()
  t:bind("127.0.0.1", 0)
  local p = t:getsockname().port
  t:close()
  return p
end

describe("mermaid fixed port", function()
  after_each(function() blk.stop() end)

  it("lazy spec pins preview.port to a fixed non-zero value", function()
    package.loaded["plugins"] = nil
    local port
    for _, s in ipairs(require("plugins")) do
      if s[1] == "kevalin/mermaid.nvim" then port = s.opts and s.opts.preview and s.opts.preview.port end
    end
    assert.is_number(port)
    assert.is_true(port > 0)
    assert.are.equal(port, blk.configured_port())
  end)

  it("gallery binds exactly the configured port", function()
    local p = free_port()
    vim.g.mermaid_port = p
    assert.are.equal(p, blk.start_server())
  end)

  it("returns nil + error when the port is already taken", function()
    local p = free_port()
    local hog = vim.uv.new_tcp()
    hog:bind("0.0.0.0", p)
    hog:listen(1, function() end)
    vim.g.mermaid_port = p
    local port, err = blk.start_server()
    hog:close()
    assert.is_nil(port)
    assert.truthy(tostring(err):match(tostring(p)))
  end)
end)
