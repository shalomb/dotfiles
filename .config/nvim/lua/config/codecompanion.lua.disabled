-- @description Configures the CodeCompanion plugin, defining strategies, keymaps, and integrating MCP Hub tools and resources for enhanced Neovim functionality.

-- See https://github.com/olimorris/codecompanion.nvim/blob/main/lua/codecompanion/config.lua#L178
-- for defaults

require("codecompanion").setup({
  strategies = {
    chat = {
      variables = {
        ["buffer"] = {
          opts = {
            default_params = 'pin', -- or 'watch'
          },
        },
      },
    },
    inline = {
    },
  },
  extensions = {
    -- @name: mcphub
    -- @description: Configuration for CodeCompanion with MCP Hub integration
    mcphub = {
      callback = "mcphub.extensions.codecompanion",
      opts = {
        -- MCP Tools
        make_tools = true,                    -- Make individual tools (@server__tool) and server groups (@server) from MCP servers
        show_server_tools_in_chat = true,     -- Show individual tools in chat completion (when make_tools=true)
        add_mcp_prefix_to_tool_names = false, -- Add mcp__ prefix (e.g `@mcp__github`, `@mcp__neovim__list_issues`)
        show_result_in_chat = true,           -- Show tool results directly in chat buffer
        format_tool = nil,                    -- function(tool_name:string, tool: CodeCompanion.Agent.Tool) : string Function to format tool names to show in the chat buffer
        -- MCP Resources
        make_vars = true,                     -- Convert MCP resources to #variables for prompts
        -- MCP Prompts
        make_slash_commands = true,           -- Add MCP prompts as /slash commands
      }
    }
  }
})

local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local group = augroup("codecompanion.chat.tweaks", { clear = true })

autocmd("FileType", {
  group = group,
  pattern = "codecompanion",
  callback = vim.schedule_wrap(function()
    vim.cmd("echo 'CodeCompanion chat tweaks start'")
    vim.keymap.set({ "n", "v" }, "}", "}", { noremap = true, silent = true })
    vim.keymap.set({ "n", "v" }, "{", "{", { noremap = true, silent = true })
    vim.cmd("echo 'CodeCompanion chat tweaks end'")
  end),
})

vim.cmd([[cab cc CodeCompanion]])
vim.cmd([[cab ccb CodeCompanion #buffer]])
