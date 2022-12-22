-- Make sure user modules can be reloaded when using :source

vim.g.shell  = vim.fn.expand("$SHELL")
vim.g.vimdir = vim.fn.expand("$VIM")
vim.g.vimrc  = vim.fn.expand("$MYVIMRC")
vim.g.vimruntime  = vim.fn.expand("$VIMRUNTIME")

vim.g.packer_package_root = require('packer').config.package_root
vim.g.python3_host_prog = '/usr/bin/python3'

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
  local files = vim.fn.glob(config_dir .. '/'.. dir .. '/*.' .. suffix)
  local vim_scripts = vim.split(files, '\n')
  for i, file in pairs(vim_scripts) do
    vim.cmd('source ' .. file)
  end
end

-- for those settings that are defaults or prereqs for modules we load really
LoadBundle('before', 'vim')

-- for lua scripts that we treat as sub modules
local lua_scripts = vim.split(vim.fn.glob(config_dir .. '/*.lua'), '\n')
for i, file in pairs(lua_scripts) do
  local basename = file:match('([^/]+).lua$')
  if basename and basename ~= 'init' then
    local module = 'config.' .. basename
    load(module)
  end
end

-- for those settings we want to overwrite
LoadBundle('after', 'vim')
