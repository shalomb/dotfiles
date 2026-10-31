describe("pass edit cleanroom & state isolation (config.pass_redact)", function()
  local PR

  before_each(function()
    package.loaded["config.pass_redact"] = nil
    package.loaded["config.core_keymaps"] = nil
    PR = require("config.pass_redact")
  end)

  describe("Scenario: Detecting pass temporary file paths and sessions", function()
    it("matches Linux /dev/shm/pass.* paths created by pass edit", function()
      assert.is_true(PR.is_pass_path("/dev/shm/pass.TvbBi1xeDTSmq/Fn1Tlm-test-detail-6.txt"))
      assert.is_true(PR.is_pass_path("/dev/shm/pass.123456/secret.txt"))
    end)

    it("matches macOS /private/var/folders/.../pass.* and /tmp/pass.* paths", function()
      assert.is_true(PR.is_pass_path("/private/var/folders/xx/yy/T/pass.abc123/secret.txt"))
      assert.is_true(PR.is_pass_path("/tmp/pass.xyz987/entry.txt"))
    end)

    it("does not match ordinary project files or non-pass tmp files", function()
      assert.is_false(PR.is_pass_path("/home/unop/projects/README.md"))
      assert.is_false(PR.is_pass_path("/tmp/notes.md"))
      assert.is_false(PR.is_pass_path("/home/unop/pass_notes.txt"))
      assert.is_false(PR.is_pass_path(""))
    end)

    it("detects a pass session when any argv entry is a pass path or NVIM_PASS_MODE=1", function()
      assert.is_true(PR.is_pass_session({ "nvim", "/dev/shm/pass.AbCdEf/sec.txt" }, {}))
      assert.is_true(PR.is_pass_session({ "nvim", "normal.txt" }, { NVIM_PASS_MODE = "1" }))
      assert.is_false(PR.is_pass_session({ "nvim", "/home/unop/prose.md" }, {}))
    end)
  end)

  describe("Scenario: Hardening Neovim state options in pass mode", function()
    it("disables swapfile, backup, writebackup, undofile, shada, and clipboard", function()
      local buf = vim.api.nvim_create_buf(true, false)
      vim.api.nvim_set_current_buf(buf)
      vim.bo[buf].swapfile = true
      vim.bo[buf].undofile = true
      vim.o.backup = true
      vim.o.writebackup = true
      vim.o.undofile = true

      PR.apply_hardening(buf)

      assert.is_true(vim.g.pass_redact_mode)
      assert.is_false(vim.bo[buf].swapfile)
      assert.is_false(vim.bo[buf].undofile)
      assert.is_false(vim.bo[buf].modeline)
      assert.is_false(vim.o.swapfile)
      assert.is_false(vim.o.backup)
      assert.is_false(vim.o.writebackup)
      assert.is_false(vim.o.undofile)
      assert.are.equal("", vim.o.shada)
      assert.are.equal("NONE", vim.o.shadafile)
      assert.are.equal("", vim.o.clipboard)

      vim.api.nvim_buf_delete(buf, { force = true })
    end)
  end)

  describe("Scenario: Preventing persistent_undo.vim from writing undo files for pass buffers", function()
    it("does not create an undo file under undodir when writing a /dev/shm/pass.* buffer", function()
      local tmp_undodir = vim.fn.tempname()
      vim.fn.mkdir(tmp_undodir, "p")
      vim.o.undodir = tmp_undodir
      vim.cmd("source " .. vim.fn.getcwd() .. "/lua/config/before/persistent_undo.vim")
      vim.o.undodir = tmp_undodir

      local fake_shm_dir = vim.fn.tempname() .. "/dev/shm/pass.TestLeak123"
      vim.fn.mkdir(fake_shm_dir, "p")
      local secret_file = fake_shm_dir .. "/secret.txt"

      vim.cmd("edit " .. vim.fn.fnameescape(secret_file))
      PR.apply_hardening(0)
      vim.api.nvim_buf_set_lines(0, 0, -1, false, { "correct-horse-battery-staple" })
      vim.cmd("silent write!")

      local leaked_undo = tmp_undodir .. secret_file .. ".undo"
      assert.are.equal(0, vim.fn.filereadable(leaked_undo))
    end)
  end)

  describe("Scenario: Self-authored navigation and text-editing tweaks remain active in pass mode", function()
    it("loads core_keymaps without requiring which-key, telescope, or any third-party plugin", function()
      local ck = require("config.core_keymaps")
      assert.is_true(pcall(ck.setup))

      local j_map = vim.fn.maparg("j", "n", false, true)
      local k_map = vim.fn.maparg("k", "n", false, true)
      local zero_map = vim.fn.maparg("0", "n", false, true)
      local cw_map = vim.fn.maparg("<C-W>", "i", false, true)

      assert.are.equal("gj", j_map.rhs)
      assert.are.equal("gk", k_map.rhs)
      assert.is_function(zero_map.callback)
      assert.are.equal("<C-g>u<C-w>", cw_map.rhs)
    end)

    it("spawns a cleanroom nvim process on a /dev/shm/pass.* path with zero lazy.nvim plugins loaded", function()
      local res = vim.system({
        vim.v.progpath,
        "--headless",
        "--cmd",
        "set rtp^=" .. vim.fn.getcwd(),
        "-u",
        vim.fn.getcwd() .. "/init.lua",
        "/dev/shm/pass.UnitTestCleanroom/test-entry.txt",
        "-c",
        "lua io.stdout:write(vim.json.encode({ lazy_loaded = package.loaded['lazy'] ~= nil, pass_mode = vim.g.pass_redact_mode == true, undofile = vim.bo.undofile, swapfile = vim.bo.swapfile, gj = vim.fn.maparg('j', 'n') }))",
        "-c",
        "qa!",
      }, { text = true }):wait()

      assert.are.equal(0, res.code)
      local payload = vim.json.decode(res.stdout)
      assert.is_false(payload.lazy_loaded)
      assert.is_true(payload.pass_mode)
      assert.is_false(payload.undofile)
      assert.is_false(payload.swapfile)
      assert.are.equal("gj", payload.gj)
    end)
  end)
end)
