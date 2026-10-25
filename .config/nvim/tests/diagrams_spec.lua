local D = require("config.diagrams")

local function spec(name)
  package.loaded["plugins"] = nil
  for _, s in ipairs(require("plugins")) do
    if s[1] == name then return s end
  end
end

describe("inline diagrams (diagram.nvim + image.nvim)", function()
  it("declares diagram.nvim for markdown, depending on image.nvim", function()
    local s = spec("3rd/diagram.nvim")
    assert.is_not_nil(s)
    assert.are.same({ "markdown" }, s.ft)
  end)

  it("is disabled (cond=false) when ImageMagick is missing", function()
    local s = spec("3rd/diagram.nvim")
    local orig = vim.fn.executable
    vim.fn.executable = function() return 0 end
    local ok = s.cond()
    vim.fn.executable = orig
    assert.is_false(ok)
  end)

  it("is enabled when magick exists", function()
    local s = spec("3rd/diagram.nvim")
    local orig = vim.fn.executable
    vim.fn.executable = function(c) return c == "magick" and 1 or 0 end
    local ok = s.cond()
    vim.fn.executable = orig
    assert.is_true(ok)
  end)

  it("builds mmdc puppeteer args with --no-sandbox and a headless shell", function()
    local root = vim.fn.tempname()
    local bin = root .. "/chrome-headless-shell/linux_arm-9/x/chrome-headless-shell"
    vim.fn.mkdir(vim.fs.dirname(bin), "p")
    vim.fn.writefile({ "" }, bin)
    local args = D.puppeteer_args(root)
    assert.are.equal("-p", args[1])
    local cfg = vim.json.decode(table.concat(vim.fn.readfile(args[2]), "\n"))
    assert.are.equal(bin, cfg.executablePath)
    assert.are.same({ "--no-sandbox" }, cfg.args)
  end)

  it("falls back to no-sandbox only when no headless shell is cached", function()
    local args = D.puppeteer_args(vim.fn.tempname())
    local cfg = vim.json.decode(table.concat(vim.fn.readfile(args[2]), "\n"))
    assert.is_nil(cfg.executablePath)
    assert.are.same({ "--no-sandbox" }, cfg.args)
  end)
end)
