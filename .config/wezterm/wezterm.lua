-- wezterm ls-fonts --list-system
local wezterm = require 'wezterm'

-- local function file_exists(path)
--   local f = io.open(path, "r")
--   if f ~= nil then
--     io.close(f)
--     return true
--   else return false end
-- end

local config = wezterm.config_builder()

config.default_cwd = "~"

config.animation_fps = 1
config.audible_bell = 'Disabled'

config.default_workspace = "home"

config.color_scheme = "Gruvbox dark"
config.color_scheme = 'AdventureTime'
config.color_scheme = "Builtin Solarized Dark"
config.color_scheme = "Builtin Solarized Light"
config.color_scheme = 'Afterglow'
config.color_scheme = 'Tokyo Night'

config.cursor_blink_ease_in = 'Constant'
config.cursor_blink_ease_out = 'Constant'
config.cursor_blink_rate = 800
config.default_cursor_style = 'SteadyBlock'
config.default_cursor_style = 'BlinkingBlock'
config.default_cursor_style = 'BlinkingBar'

config.enable_tab_bar = true
config.hide_tab_bar_if_only_one_tab = true
config.tab_bar_at_bottom = true
config.use_fancy_tab_bar = false

config.initial_cols = 120
config.initial_rows = 32
config.max_fps = 240
config.scrollback_lines = 16384
config.show_update_window = true

config.window_background_opacity = 0.925
config.window_background_opacity = 0.97
config.window_decorations = "RESIZE"
config.window_decorations = "TITLE | RESIZE"

config.colors = {
  foreground = '#acacac',
  cursor_bg = '#ff6000',
  cursor_fg = '#0f6000',
}

config.line_height = 1.0
config.font_size = 12.5

-- wezterm ls-fonts --list-system
config.font = wezterm.font_with_fallback {

  { family = "BitStream Vera Sans Mono",
    weight = "Bold",
    stretch = "Normal",
    style = "Normal"
  },

  { family = "DejaVu Sans Mono",
    weight = "Bold",
    -- weight = "Normal",
  },

  { family = "Operator Mono SSm Lig", weight = 325, italic = true },

  { family = "JetBrains Mono",
    weight = "Bold",
    stretch = "Normal",
    style = "Normal"
  }, -- <built-in>, BuiltIn

  {
    family = 'Fira Code',
    weight = "Regular",
    stretch = 'Normal',
    style = Normal
  },
}

config.font_rules = {
  -- normal-intensity-and-italic
  {
    intensity = 'Normal',
    italic = true,
    font = wezterm.font_with_fallback {
      italic = true, -- disable the severe italic slant
      weight = 'Light'
    }
  }
}

config.quick_select_patterns = {
  -- match things that look like sha1 hashes
  -- (this is actually one of the default patterns)
  '\\S+'
}

config.hyperlink_rules = {
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
    regex = [[\bECS1-(\d+)\b]],
    format = 'https://onetakeda.atlassian.net/browse/ECS1-$1',
  },

  -- Make username/project paths clickable. This implies paths like the following are for GitHub.
  -- ( "nvim-treesitter/nvim-treesitter" | wbthomason/packer.nvim | wez/wezterm | "wez/wezterm.git" )
  -- As long as a full URL hyperlink regex exists above this it should not match a full URL to
  -- GitHub or GitLab / BitBucket (i.e. https://gitlab.com/user/project.git is still a whole clickable URL)
  {
    regex = [[["]?([\w\d]{1}[-\w\d]+)(/){1}([-\w\d\.]+)["]?]],
    format = 'https://www.github.com/$1/$3',
  }
}

config.keys = {
  { mods = "CTRL", key = "q", action = wezterm.action { SendString = "\x11" } },
}

wezterm.on('bell', function(window, pane)
  wezterm.log_info('the bell was rung in pane ' .. pane:pane_id() .. '!')
end)

wezterm.on('update-right-status', function(window, pane)
  local date = wezterm.strftime '%Y-%m-%d %H:%M'

  -- Make it italic and underlined
  window:set_right_status(wezterm.format {
    { Attribute = { Underline = 'None' } },
    { Attribute = { Italic = true } },
    { Text = date },
  })
end)

return config
