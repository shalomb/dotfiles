-- utils

local vim = vim

-- OK
vim.fn.OK = function(msg)
  -- TODO luaize this
  vim.cmd([[
    echohl DiagnosticHint
    echon "OK: "
    echohl None
  ]])
  vim.cmd('echon "' .. msg .. '"')
  -- vim.notify('OK: ' .. msg)
end

-- Not OK
vim.fn.NOK = function(msg)
  -- TODO luaize this
  -- vim.notify('ERR: ' .. msg, vim.log.levels.WARN)
  vim.cmd([[
    echohl DiagnosticError
    echon "NOK: "
    echohl None
  ]])
  vim.cmd('echon "' .. msg .. '"')
end

-- Not OK
vim.fn.ERR = function(msg)
  -- vim.notify('ERR: ' .. msg, vim.log.levels.ERROR)
  vim.cmd([[
    echohl DiagnosticError
    echon "ERR: "
    echohl None
  ]])
  vim.cmd('echon "' .. msg .. '"')
end

-- vim.fn.OK("awrite")

