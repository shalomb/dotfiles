-- init

local vim = vim

local load = function(mod)
  package.loaded[mod] = nil
  require(mod)
end

local function script_path()
  local str = debug.getinfo(2, "S").source:sub(2)
  return str:match("(.*/)")
end

local config_dir = script_path()

local function LoadBundle(dir, suffix)
  local files = vim.fn.glob(config_dir .. '/' .. dir .. '/*.' .. suffix)
  local vim_scripts = vim.split(files, '\n')
  for _, file in pairs(vim_scripts) do
    if file ~= "" then
      vim.cmd('source ' .. file)
    end
  end
end

if vim.g.pass_redact_mode then
  local pass_redact = require("config.pass_redact")
  for _, basename in ipairs(pass_redact.allowed_modules) do
    load("config." .. basename)
  end
  require("config.core_keymaps").setup()
  pass_redact.apply_hardening(0)
  return
end

-- for those settings that are defaults or prereqs for modules we load really
LoadBundle('before', 'vim')

-- for lua scripts that we treat as sub modules
local lua_scripts = vim.split(vim.fn.glob(config_dir .. '/*.lua'), '\n')
for _, file in pairs(lua_scripts) do
  local basename = file:match('([^/]+).lua$')
  if basename and basename ~= 'init' and basename ~= 'pass_redact' and basename ~= 'core_keymaps' then
    local module = 'config.' .. basename
    load(module)
  end
end

-- for those settings we want to overwrite
LoadBundle('after', 'vim')
