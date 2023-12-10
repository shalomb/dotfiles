-- folke/flash.nvim

local whichkey = require("which-key")
local flash = require("flash")

require('flash').setup({
  labels = "abcdefghijklmnopqrstuvwxyz",
  search = {
    -- search/jump in all windows
    multi_window = true,
    forward = true,
    -- when `false`, find only matches in the given direction
    wrap = true,
    ---@type Flash.Pattern.Mode
    -- Each mode will take ignorecase and smartcase into account.
    -- * exact: exact match
    -- * search: regular search
    -- * fuzzy: fuzzy search
    -- * fun(str): custom function that returns a pattern
    --   For example, to only match at the beginning of a word:
    --   mode = function(str)
    --     return "\\<" .. str
    --   end,
    -- mode = "exact",
  },
  modes = {
    char = {
      jump_labels = true
    }
  },
  jump = {
    -- save location in the jumplist
    jumplist = true,
    -- jump position
    pos = "start", ---@type "start" | "end" | "range"
    -- add pattern to search history
    history = true,
    -- add pattern to search register
    register = true,
    -- clear highlight after jump
    nohlsearch = true,
    -- automatically jump when there is only one match
    autojump = true,
  },
})

---@param opts Flash.Format
local function format(opts)
  -- always show first and second label
  return {
    { opts.match.label1, "FlashMatch" },
    { opts.match.label2, "FlashLabel" },
  }
end

whichkey.register({
  name = "chords",

  ["s"] = {
    ["l"] = {
      function()
        flash.jump({
          search = { mode = "search", max_length = 0 },
          label = { before = false, after = { 0, 0 }, uppercase = false },
          pattern = "^"
        })
      end,
      'Search line',
    },

    ["w"] = {
      function()
        flash.jump({
          search = { mode = "search" },
          pattern = vim.fn.expand("<cword>"),
          label = { after = { 0, 0 }, uppercase = false },
          jump = {
            -- save location in the jumplist
            jumplist = true,
            -- jump position
            pos = "start", ---@type "start" | "end" | "range"
            -- add pattern to search history
            history = true,
            -- add pattern to search register
            register = true,
            -- clear highlight after jump
            nohlsearch = true,
            -- automatically jump when there is only one match
            autojump = true,
          },
        })
      end,
      'Search word',
    }

  }
}, { mode = "n", prefix = "<leader>" })
