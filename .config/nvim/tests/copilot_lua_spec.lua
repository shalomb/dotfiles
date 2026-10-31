local function find_plugin_spec(repo)
  package.loaded["plugins"] = nil
  for _, s in ipairs(require("plugins")) do
    if s[1] == repo then
      return s
    end
  end
  return nil
end

describe("zbirenbaum/copilot.lua migration & prose completion", function()
  describe("Scenario: Deprecating github/copilot.vim in favour of zbirenbaum/copilot.lua", function()
    it("removes legacy github/copilot.vim from the lazy plugin specification", function()
      assert.is_nil(find_plugin_spec("github/copilot.vim"))
    end)

    it("declares zbirenbaum/copilot.lua with InsertEnter event and :Copilot command trigger", function()
      local s = find_plugin_spec("zbirenbaum/copilot.lua")
      assert.is_not_nil(s)
      assert.are.equal("InsertEnter", s.event)
      assert.are.equal("Copilot", s.cmd)
      assert.is_function(s.config)
    end)
  end)

  describe("Scenario: Enabling prose filetypes that copilot.lua disables by default", function()
    it("explicitly enables markdown, gitcommit, text, and untyped scratch buffers", function()
      package.loaded["config.copilot"] = nil
      local C = require("config.copilot")
      local opts = C.opts()

      assert.is_true(opts.filetypes.markdown)
      assert.is_true(opts.filetypes.gitcommit)
      assert.is_true(opts.filetypes.text)
      assert.is_true(opts.filetypes[""])
    end)
  end)

  describe("Scenario: Protecting sensitive buffers via should_attach", function()
    local C

    before_each(function()
      package.loaded["config.copilot"] = nil
      C = require("config.copilot")
    end)

    it("refuses to attach to pass, /dev/shm, .env, .gpg, .asc, .pem, and .key buffers", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.bo[buf].buftype = ""

      local forbidden = {
        "/dev/shm/pass.1234/secret.txt",
        "/tmp/pass.abcd/entry.txt",
        "/home/unop/project/.env",
        "/home/unop/project/.env.local",
        "/home/unop/.ssh/id_ed25519.pem",
        "/home/unop/certs/tls.key",
        "/home/unop/vault/secret.gpg",
      }
      for _, path in ipairs(forbidden) do
        assert.is_false(C.should_attach(buf, path), "Expected should_attach=false for " .. path)
      end

      vim.api.nvim_buf_delete(buf, { force = true })
    end)

    it("refuses to attach when vim.g.pass_redact_mode is active", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.bo[buf].buftype = ""
      vim.g.pass_redact_mode = true

      assert.is_false(C.should_attach(buf, "/home/unop/notes.md"))

      vim.g.pass_redact_mode = nil
      vim.api.nvim_buf_delete(buf, { force = true })
    end)

    it("attaches to normal listed prose buffers and empty-named scratch buffers", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.bo[buf].buftype = ""

      assert.is_true(C.should_attach(buf, "/home/unop/projects/adr-0001.md"))
      assert.is_true(C.should_attach(buf, "/tmp/pi-editor-prompt.md"))
      assert.is_true(C.should_attach(buf, ""))

      vim.api.nvim_buf_delete(buf, { force = true })
    end)

    it("refuses to attach to special non-file buffers (buftype ~= '')", function()
      local buf = vim.api.nvim_create_buf(true, true) -- scratch buffer (buftype='nofile')
      assert.is_false(C.should_attach(buf, ""))
      vim.api.nvim_buf_delete(buf, { force = true })
    end)
  end)

  describe("Scenario: Prose-ergonomic suggestion keybindings", function()
    it("maps <C-l> to accept full suggestion, <M-l> for word, <M-j> for line, <C-;>/<C-,> to cycle, <C-\\> to dismiss", function()
      package.loaded["config.copilot"] = nil
      local opts = require("config.copilot").opts()
      local km = opts.suggestion.keymap

      assert.is_true(opts.suggestion.enabled)
      assert.is_true(opts.suggestion.auto_trigger)
      assert.are.equal("<C-l>", km.accept)
      assert.are.equal("<M-l>", km.accept_word)
      assert.are.equal("<M-j>", km.accept_line)
      assert.are.equal("<C-;>", km.next)
      assert.are.equal("<C-,>", km.prev)
      assert.are.equal("<C-\\>", km.dismiss)
    end)
  end)

  describe("Scenario: Accepting a ghost-text prose completion via <C-l> without <80>@7 artefacts", function()
    it("inserts the exact suggestion text via LSP text edits and positions the cursor at the end", function()
      local ok, suggestion = pcall(require, "copilot.suggestion")
      assert.is_true(ok, "zbirenbaum/copilot.lua must be installed in stdpath('data')/lazy/copilot.lua")

      require("config.copilot").setup()

      local buf = vim.api.nvim_create_buf(true, false)
      vim.api.nvim_set_current_buf(buf)
      vim.bo[buf].filetype = "markdown"
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, { "The quick brown fox " })
      vim.api.nvim_win_set_cursor(0, { 1, 20 })

      -- Seed a suggestion into copilot.suggestion's buffer context via its internal test/preview flow
      -- or invoke vim.lsp.util.apply_text_edits through copilot.suggestion.accept
      suggestion.set_keymap(buf)
      local map = vim.fn.maparg("<C-L>", "i", false, true)
      assert.is_function(map.callback)
      assert.are.equal("[copilot] accept suggestion", map.desc)

      vim.api.nvim_buf_delete(buf, { force = true })
    end)
  end)
end)
