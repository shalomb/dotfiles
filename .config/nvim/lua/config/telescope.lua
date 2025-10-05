-- config for telescope

local vim     = vim

local actions = require("telescope.actions")
local builtin = require("telescope.builtin")
local finders = require("telescope.finders")
local pickers = require("telescope.pickers")
local sorters = require("telescope.sorters")
local state   = require("telescope.actions.state")

-- vim.api.nvim_set_hl(0, 'NormalFloat', { ctermfg = "LightGrey" })

require("telescope").setup({
  defaults = {
    vimgrep_arguments = {
      "rg",
      "--color=never",
      "--no-heading",
      "--with-filename",
      "--line-number",
      "--column",
      "--smart-case",
      "--no-unicode"
    },
    layout_config = {
      vertical = { width = 0.75 }
    },
    mappings = {
      i = {
        ["<C-h>"] = "which_key",
        ["<Up>"] = actions.cycle_history_prev,
        ["<Down>"] = actions.cycle_history_next,
      }
    },
    pickers = {
      live_grep = {
        theme = "ivy",
        layout_config = {
          height = 0.8,
        },
        attach_mappings = function(prompt_bufnr, map)
          local actions = require("telescope.actions")
          local action_state = require("telescope.actions.state")
          
          -- Debug: Print entry information
          map("i", "<C-d>", function()
            local entry = action_state.get_selected_entry()
            local log_file = "/tmp/lg-debug.log"
            local log = io.open(log_file, "a")
            if log then
              log:write("\n=== LIVE GREP ENTRY DEBUG ===\n")
              log:write("Timestamp: " .. os.date("%Y-%m-%d %H:%M:%S") .. "\n")
              log:write("Entry: " .. vim.inspect(entry) .. "\n")
              if entry then
                log:write("Filename: " .. tostring(entry.filename) .. "\n")
                log:write("Lnum: " .. tostring(entry.lnum) .. "\n")
                log:write("Col: " .. tostring(entry.col) .. "\n")
                log:write("Text: " .. tostring(entry.text) .. "\n")
                log:write("Display: " .. tostring(entry.display) .. "\n")
              end
              log:write("=============================\n")
              log:close()
              print("Entry debug written to: " .. log_file)
            else
              print("Failed to open log file for writing")
            end
          end)
          
          -- Debug: Print all entries when picker opens
          local picker = action_state.get_current_picker(prompt_bufnr)
          if picker and picker.manager then
            local entries = picker.manager:get_entries()
            local log_file = "/tmp/lg-debug.log"
            local log = io.open(log_file, "a")
            if log then
              log:write("\n=== PICKER DEBUG ===\n")
              log:write("Timestamp: " .. os.date("%Y-%m-%d %H:%M:%S") .. "\n")
              log:write("Total entries: " .. #entries .. "\n")
              if #entries > 0 then
                log:write("First entry: " .. vim.inspect(entries[1]) .. "\n")
              end
              log:write("===================\n")
              log:close()
            end
          end
          
          return true
        end,
      },
    },
  },
})

-- Debug command to test ripgrep output
vim.api.nvim_create_user_command("DebugRipgrep", function(opts)
  local search_term = opts.args or "test"
  local log_file = "/tmp/lg-debug.log"
  
  -- Open log file for writing
  local log = io.open(log_file, "w")
  if not log then
    print("Failed to open log file: " .. log_file)
    return
  end
  
  local function log_write(...)
    local args = {...}
    for i, arg in ipairs(args) do
      log:write(tostring(arg))
      if i < #args then
        log:write("\t")
      end
    end
    log:write("\n")
  end
  
  local cmd = {
    "rg",
    "--color=never",
    "--no-heading", 
    "--with-filename",
    "--line-number",
    "--column",
    "--smart-case",
    search_term,
    "."
  }
  
  log_write("=== LIVE GREP DEBUG SESSION ===")
  log_write("Timestamp:", os.date("%Y-%m-%d %H:%M:%S"))
  log_write("Search term:", search_term)
  log_write("Running command:", table.concat(cmd, " "))
  log_write("")
  
  local handle = io.popen(table.concat(cmd, " "))
  if handle then
    local result = handle:read("*a")
    handle:close()
    
    log_write("=== RIPGREP OUTPUT ===")
    log_write(result)
    log_write("=====================")
    log_write("")
    
    -- Parse first line to see format
    local lines = vim.split(result, "\n")
    if #lines > 0 and lines[1] ~= "" then
      log_write("=== PARSED FIRST LINE ===")
      local line = lines[1]
      log_write("Raw line:", vim.inspect(line))
      
      -- Try to parse filename:line:col:text format
      local filename, lnum, col, text = line:match("([^:]+):(%d+):(%d+):(.+)")
      if filename then
        log_write("Parsed filename:", filename)
        log_write("Parsed lnum:", lnum)
        log_write("Parsed col:", col)
        log_write("Parsed text:", text)
      else
        log_write("Failed to parse line format")
        -- Try alternative parsing
        local alt_filename, alt_lnum, alt_text = line:match("([^:]+):(%d+):(.+)")
        if alt_filename then
          log_write("Alternative parse - filename:", alt_filename)
          log_write("Alternative parse - lnum:", alt_lnum)
          log_write("Alternative parse - text:", alt_text)
        end
      end
      log_write("========================")
    end
  else
    log_write("Failed to run ripgrep command")
  end
  
  log:close()
  print("Debug output written to: " .. log_file)
end, { nargs = "?", complete = "file" })

local arr = {}
for k, _ in pairs(builtin) do
  table.insert(arr, k)
end
