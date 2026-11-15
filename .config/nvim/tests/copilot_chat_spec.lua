local function find_plugin_spec(repo)
  package.loaded["plugins"] = nil
  for _, s in ipairs(require("plugins")) do
    if s[1] == repo then
      return s
    end
  end
  return nil
end

describe("CopilotC-Nvim/CopilotChat.nvim conversational chat", function()
  it("declares the plugin, lazy-loaded on :CopilotChat commands, depending on copilot.lua and plenary", function()
    local s = find_plugin_spec("CopilotC-Nvim/CopilotChat.nvim")
    assert.is_not_nil(s)
    assert.is_truthy(vim.tbl_contains(s.cmd, "CopilotChat"))
    assert.is_truthy(vim.tbl_contains(s.dependencies, "zbirenbaum/copilot.lua"))
    assert.is_truthy(vim.tbl_contains(s.dependencies, "nvim-lua/plenary.nvim"))
  end)

  it("maps <leader>cc to toggle the chat window", function()
    local s = find_plugin_spec("CopilotC-Nvim/CopilotChat.nvim")
    local found
    for _, k in ipairs(s.keys) do
      if k[1] == "<leader>cc" then found = k end
    end
    assert.is_not_nil(found)
    assert.are.equal("<cmd>CopilotChatToggle<cr>", found[2])
  end)
end)

describe("CopilotChat default model", function()
  it("pins a model available on the Business seat, not the plugin default gpt-5-mini", function()
    local s = find_plugin_spec("CopilotC-Nvim/CopilotChat.nvim")
    assert.are.equal("claude-sonnet-5.5", s.opts.model)
  end)
end)
