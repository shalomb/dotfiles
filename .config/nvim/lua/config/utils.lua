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

local get_visual_selection = function()
  local s_start = vim.fn.getpos("'<")
  local s_end = vim.fn.getpos("'>")
  local n_lines = math.abs(s_end[2] - s_start[2]) + 1
  local lines = vim.api.nvim_buf_get_lines(0, s_start[2] - 1, s_end[2], false)
  lines[1] = string.sub(lines[1], s_start[3], -1)
  if n_lines == 1 then
    lines[n_lines] = string.sub(lines[n_lines], 1, s_end[3] - s_start[3] + 1)
  else
    lines[n_lines] = string.sub(lines[n_lines], 1, s_end[3])
  end
  return table.concat(lines, '\n')
end
