local markview = require("markview");
local presets = require("markview.presets");

markview.setup({
  -- headings = presets.headings.glow_labels
  markdown = {
    headings = {
      enable = true,

      -- heading_1 = {
      --   style = "label",
      --
      --   padding_left = " ⎷",
      --   padding_right = " ",
      --
      --   hl = "MarkviewHeading1"
      -- }

      heading_1 = { style = "simple", hl = "MarkviewHeading1" },
      heading_2 = { style = "simple", hl = "MarkviewHeading2" },
      heading_3 = { style = "simple", hl = "MarkviewHeading3" },
      heading_4 = { style = "simple", hl = "MarkviewHeading4" },
      heading_5 = { style = "simple", hl = "MarkviewHeading5" },
      heading_6 = { style = "simple", hl = "MarkviewHeading6" },
    }
  },
  links = {
    inline_links = {
      hl = "@markup.link.label.markown_inline",
      icon = " ",
      icon_hl = "@markup.link",
    },
    images = {
      hl = "@markup.link.label.markown_inline",
      icon = " ",
      icon_hl = "@markup.link",
    },
  },
  checkboxes = {
    enable = true,

    checked = {
      text = "✔", hl = "TabLineSel"
    },
    unchecked = {
      text = "🮱", hl = "TabLineSel"
    },
    pending = {
      text = "?", hl = "TabLineSel"
    },

    custom = {
      {
        match = "~",
        text = "◕",
        hl = "CheckboxProgress"
      }
    }
  },
  code_blocks = {
    enable = true,
    style = "simple",

    pad_amount = 2,
    pad_char = "-",
    icons = true,
    position = nil,
    min_width = 70,

    language_direction = "left",
    -- language_names = {
    --   "bash",
    --   "sh"
    -- },

    border_hl = "CursorLine",

    sign = true,
    sign_hl = nil
  },
  experimental = {
    check_rtp_message = false
  }
});

require("markview").setup({
  -- This is nice to have
  preview = {
    modes = { "n", "no", "c" },     -- Change these modes
    -- to what you need

    hybrid_modes = { "n" },     -- Uses this feature on
    -- normal mode
    callbacks = {
      on_enable = function(_, win)
        vim.wo[win].conceallevel = 2;
        vim.wo[win].concealcursor = "c";
      end
    }
  }
})

require("markview").setup({
  -- This is nice to have
  preview = {
    modes = { "n", "i", "no", "c" },
    hybrid_modes = { "i" },
    callbacks = {
      on_enable = function(_, win)
        vim.wo[win].conceallevel = 2;
        vim.wo[win].concealcursor = "nc";
      end
    }
  }
})

vim.cmd("Markview Enable");
