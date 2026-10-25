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

  local function cond_with(magick, optin)
    local s = spec("3rd/diagram.nvim")
    local orig = vim.fn.executable
    vim.fn.executable = function(c) return (magick and c == "magick") and 1 or 0 end
    vim.g.mermaid_inline = optin
    local ok = s.cond()
    vim.fn.executable = orig
    vim.g.mermaid_inline = nil
    return ok
  end

  it("is OFF by default even when ImageMagick exists (tmux passthrough is flaky)", function()
    assert.is_false(cond_with(true, nil))
  end)

  it("is off when opted in but ImageMagick is missing", function()
    assert.is_false(cond_with(false, true))
  end)

  it("is on only when opted in via vim.g.mermaid_inline AND magick exists", function()
    assert.is_true(cond_with(true, true))
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

describe("inline diagram sizing", function()
  local function image_opts()
    package.loaded["plugins"] = nil
    for _, s in ipairs(require("plugins")) do
      if s[1] == "3rd/diagram.nvim" then
        for _, d in ipairs(s.dependencies) do
          if type(d) == "table" and d[1] == "3rd/image.nvim" then return d.opts end
        end
      end
    end
  end

  it("caps image height so diagrams don't overrun the buffer", function()
    local o = image_opts()
    assert.is_true(o.max_height_window_percentage <= 30)
    assert.is_true(o.max_width_window_percentage <= 80)
  end)

  it("does not oversample mermaid (scale 1)", function()
    package.loaded["plugins"] = nil
    for _, s in ipairs(require("plugins")) do
      if s[1] == "3rd/diagram.nvim" then
        assert.are.equal(1, s.opts().renderer_options.mermaid.scale)
      end
    end
  end)
end)
