-- folke/flash.nvim

local whichkey = require("which-key")
local flash = require("flash")

require('flash').setup({
  labels = "asdfghjklqwertyuiopzxcvbnmASDFGHJKLQWERTYUIOPZXCVBNM01234567890",
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
    mode = "fuzzy",
    -- behave like `incsearch`
    incremental = false,
    exclude = {
      "notify",
      "cmp_menu",
      "noice",
      "flash_prompt",
      function(win)
        -- exclude non-focusable windows
        return not vim.api.nvim_win_get_config(win).focusable
      end,
    },
    -- Optional trigger character that needs to be typed before
    -- a jump label can be used. It's NOT recommended to set this,
    -- unless you know what you're doing
    trigger = "",
    -- max pattern length. If the pattern length is equal to this
    -- labels will no longer be skipped. When it exceeds this length
    -- it will either end in a jump or terminate the search
    max_length = false, ---@type number|false
  },
  modes = {
    char = {
      jump_labels = true
    },
    search = {
      enabled = true,
      highlight = { backdrop = true },
      jump = { history = true, register = true, nohlsearch = true },
      search = {
        -- `forward` will be automatically set to the search direction
        -- `mode` is always set to `search`
        -- `incremental` is set to `true` when `incsearch` is enabled
      },
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
    autojump = false,
  },
  label = {
    -- allow uppercase labels
    uppercase = true,
    -- add any labels with the correct case here, that you want to exclude
    exclude = "",
    -- add a label for the first match in the current window.
    -- you can always jump to the first match with `<CR>`
    current = true,
    -- show the label after the match
    after = true, ---@type boolean|number[]
    -- show the label before the match
    before = false, ---@type boolean|number[]
    -- position of the label extmark
    style = "overlay", ---@type "eol" | "overlay" | "right_align" | "inline"
    -- flash tries to re-use labels that were already assigned to a position,
    -- when typing more characters. By default only lower-case labels are re-used.
    reuse = "lowercase", ---@type "lowercase" | "all" | "none"
    -- for the current window, label targets closer to the cursor first
    distance = true,
    -- minimum pattern length to show labels
    -- Ignored for custom labelers.
    min_pattern_length = 0,
    -- Enable this to use rainbow colors to highlight labels
    -- Can be useful for visualizing Treesitter ranges.
    rainbow = {
      enabled = true,
      -- number between 1 and 9
      shade = 7,
    },
    -- With `format`, you can change how the label is rendered.
    -- Should return a list of `[text, highlight]` tuples.
    ---@class Flash.Format
    ---@field state Flash.State
    ---@field match Flash.Match
    ---@field hl_group string
    ---@field after boolean
    ---@type fun(opts:Flash.Format): string[][]
    format = function(opts)
      return { { opts.match.label, opts.hl_group } }
    end,
  },
  -- initial pattern to use when opening flash
  pattern = "",
  -- When `true`, flash will try to continue the last search
  continue = false,
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

    ["S"] = {
      function()
        flash.treesitter()
      end,
      'Jump',
    },

    ["s"] = {
      function()
        flash.jump()
      end,
      'Jump',
    },

    ["R"] = {
      function()
        flash.treesitter_search()
      end,
      'Search treesitter',
    },

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
