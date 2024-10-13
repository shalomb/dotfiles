-- lua

local dap = require('dap')

local dap = require('dap')
dap.adapters.python = {
  type = 'executable',
  command = os.getenv('PWD') .. '/venv/bin/python3',
  args = { '-m', 'debugpy.adapter' },
}

dap.defaults.python = {
  focus_terminal = false
}
dap.defaults.fallback.external_terminal = {
  command = '/usr/bin/alacritty',
  args = { '-e' },
}

dap.configurations.python = {
  {
    type = 'python',
    request = 'launch',
    name = "Launch file",
    program = "${file}",
    pythonPath = function()
      return '/usr/bin/python3'
    end,
  },
}

local adapter = {
  type = 'server',
  host = '127.0.0.1',
  port = 8080,
  enrich_config = function(config, on_config)
    local final_config = vim.deepcopy(config)
    final_config.extra_property = 'This got injected by the adapter'
    on_config(final_config)
  end,
}

local repl = require 'dap.repl'
repl.commands = vim.tbl_extend('force', repl.commands, {
  -- Add a new alias for the existing .exit command
  exit = { 'exit', '.exit', '.e', '.q', ':q' },
  out = { 'out', '.out', '.o', },
  into = { 'into', '.into', '.in', '.i' },
  scopes = { 'scopes', '.scopes', 'vars', '.vars', '.v', '.s' },
  -- Add your own commands; run `.echo hello world` to invoke
  -- this function with the text "hello world"
  custom_commands = {
    ['.echo'] = function(text)
      dap.repl.append(text)
    end,
    -- Hook up a new command to an existing dap function
    ['.restart'] = dap.restart,
  },
})

local whichkey = require("which-key")
whichkey.add({
  { "<leader>d", name = "dap debug", group = "debug", mode = { "n" } }, -- optional group name
  {
    "<leader>dd",
    require('dap').continue,
    desc = "continue"
  },

  {
    "<leader>db",
    function()
      require('dap').toggle_breakpoint()
    end,
    desc = "toggle break point",
  },

  {
    "<leader>dB",
    function()
      require('dap').set_breakpoint(nil, nil, vim.fn.input('Log point message: '))
    end,
    desc = "toggle log point",
  },

  {
    "<leader>dr",
    function()
      require('dap').repl.open()
    end,
    desc = "launch repl",
  },

  {
    "<leader>dso",
    function()
      require 'dap'.step_over()
    end,
    desc = "step over",
  },

  {
    "<leader>dsO",
    function()
      require 'dap'.step_out()
    end,
    desc = "step out",
  },

  {
    "<leader>dsi",
    function()
      require 'dap'.step_into()
    end,
    desc = "step into",
  },

  {
    "<leader>dh",
    function()
      require('dap.ui.widgets').hover()
    end,
    desc = "hover",
  },

  {
    "<leader>dp",
    function()
      require('dap.ui.widgets').preview()
    end,
    desc = "preview",
  },

  {
    "<leader>ds",
    function()
      local widgets = require('dap.ui.widgets')
      widgets.centered_float(widgets.scopes)
    end,
    desc = "widget.scopes",
  },

  {
    "<leader>df",
    function()
      local widgets = require('dap.ui.widgets')
      widgets.centered_float(widgets.frames)
    end,
    desc = "widget.frames",
  },

  {
    "<leader>dl",
    function()
      require 'dap'.run_last()
    end,
    desc = "run last",
  },

})
