-- wezterm ls-fonts --list-system 
local wezterm = require 'wezterm'

wezterm.on('bell', function(window, pane)
  wezterm.log_info('the bell was rung in pane ' .. pane:pane_id() .. '!')
end)

return {
  scrollback_lines = 16384,
  window_background_opacity = 0.97,
  hide_tab_bar_if_only_one_tab = true,
  color_scheme = 'Afterglow',
  audible_bell = 'Disabled',
  -- colors = {
  --   foreground = '#bcbcbc',
  --   cursor_bg = '#ff6000',
  -- },
  font = wezterm.font_with_fallback {
    { family="BitStream Vera Sans Mono",
      weight="Bold", stretch="Normal", style="Normal"
      -- weight="Bold",
      -- weight="Normal",
    },
    { family="DejaVu Sans Mono",
      -- weight="Bold",
      -- weight="Normal",
    },
  },
  font_size=13,
  font_rules = {
    -- normal-intensity-and-italic
    {
      intensity = 'Normal',
      italic = true,
      font = wezterm.font_with_fallback {
        italic = true,  -- disable the severe italic slant
        weight = 'Light'
      },
    },
  },
  quick_select_patterns = {
    -- match things that look like sha1 hashes
    -- (this is actually one of the default patterns)
    '\\S+',
  },
  hyperlink_rules = {
    -- Linkify things that look like URLs and the host has a TLD name.
    -- Compiled-in default. Used if you don't specify any hyperlink_rules.
    {
      regex = '\\b\\w+://[\\w.-]+\\.[a-z]{2,15}\\S*\\b',
      format = '$0',
    },

    -- linkify email addresses
    -- Compiled-in default. Used if you don't specify any hyperlink_rules.
    {
      regex = [[\b\w+@[\w-]+(\.[\w-]+)+\b]],
      format = 'mailto:$0',
    },

    -- file:// URI
    -- Compiled-in default. Used if you don't specify any hyperlink_rules.
    {
      regex = [[\bfile://\S*\b]],
      format = '$0',
    },

    -- Linkify things that look like URLs with numeric addresses as hosts.
    -- E.g. http://127.0.0.1:8000 for a local development server,
    -- or http://192.168.1.1 for the web interface of many routers.
    {
      regex = [[\b\w+://(?:[\d]{1,3}\.){3}[\d]{1,3}\S*\b]],
      format = '$0',
    },

    -- Make task numbers clickable
    -- The first matched regex group is captured in $1.
    {
      regex = [[\b[tT](\d+)\b]],
      format = 'https://example.com/tasks/?t=$1',
    },

    -- Make username/project paths clickable. This implies paths like the following are for GitHub.
    -- ( "nvim-treesitter/nvim-treesitter" | wbthomason/packer.nvim | wez/wezterm | "wez/wezterm.git" )
    -- As long as a full URL hyperlink regex exists above this it should not match a full URL to
    -- GitHub or GitLab / BitBucket (i.e. https://gitlab.com/user/project.git is still a whole clickable URL)
    {
      regex = [[["]?([\w\d]{1}[-\w\d]+)(/){1}([-\w\d\.]+)["]?]],
      format = 'https://www.github.com/$1/$3',
    },
  },
  keys = {
    { mods = "CTRL", key = "q", action=wezterm.action{ SendString="\x11" } },
  },
}
