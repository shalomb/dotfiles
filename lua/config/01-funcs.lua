-- lua

local vim = vim
local _G = _G

_G.pp = function(object)
  print(vim.inspect(object))
end

vim.fnlocal = {}

vim.fnlocal.spawn = function(cmd)
  return os.execute(cmd) -- return the exit code
end

vim.fnlocal.rstrip = function(str)
  return string.sub(str, 0, -2) -- strip trailing newline
end

vim.fnlocal.exec = function(cmd)
  local popen = assert(io.popen(cmd, 'r'))
  local output = popen:read('*all')
  popen:close()
  return vim.fnlocal.rstrip(output)
end

-- vim.cmd([[
-- function! VisualSelectLastChange()
--   let vr = getregtype(v:register)[0]
--   call feedkeys("`[" . vr . "`]")
-- endfunction
-- ]])

_G.VisualSelectLastChange = function()
  local vr = vim.fn.getregtype('"')
  vim.fn.feedkeys("`[" .. vr .. "`]")
end

-- adapted from s:get_visual_selection()
-- https://stackoverflow.com/a/6271254/742600
_G.GetVisualSelection = function()
  local _, line_start, column_start = unpack(vim.fn.getpos("'<"))
  local _, line_end, column_end = unpack(vim.fn.getpos("'>"))
  local lines = vim.fn.getline(line_start, line_end)
  if lines == {} or lines == nil then
    return ''
  end
  local inclusion = vim.api.nvim_get_option('selection') == 'inclusive' and 0 or 1
  lines[#lines] = string.sub(lines[#lines], 1, column_end - inclusion)
  lines[1] = string.sub(lines[1], column_start)
  return vim.fn.join(lines, "\n")
end

-- vim.cmd([[
-- function! GetVisualSelection()
--   " Why is this not a built-in Vim script function?!
--   let [line_start, column_start] = getpos("'<")[1:2]
--   let [line_end, column_end] = getpos("'>")[1:2]
--   let lines = getline(line_start, line_end)
--   if len(lines) == 0
--     return ''
--   endif
--   let lines[-1] = lines[-1][: column_end - (&selection ==# 'inclusive' ? 1 : 2)]
--   let lines[0] = lines[0][column_start - 1:]
--   return join(lines, "\n")
-- endfunction
-- ]])

local partial = function(partial, args)
  return function()
    if vim.fnlocal.defined(args) then
      return partial(args)
    else
      return partial()
    end
  end
end

local os_exec = function(cmd)
  return function()
    return vim.fnlocal.exec(cmd)
  end
end

local fnlocal = {

  ['CurArch']            = os_exec('uname -m'),
  ['CurDateC']           = partial(vim.fn.strftime, '%c'),
  ['CurDate']            = partial(vim.fn.strftime, '%FT%T'),
  ['CurDateRfc3389']     = partial(vim.fn.strftime, '%FT%T%z'),
  ['CurDateZ']           = partial(vim.fn.strftime, '%F %T%z'),
  ['CurExpr']            = partial(vim.fn.expand, '<cexpr>'),
  ['CurFileDirectory']   = partial(vim.fn.expand, '%:p:h'),
  ['CurFile']            = partial(vim.fn.expand, '%:t'),
  ['CurFQDN']            = os_exec('hostname -f'),
  ['CurGitBranch']       = os_exec('git rev-parse --abbrev-ref HEAD'),
  ['CurGitCommitMessage']   = os_exec('git log -1 --oneline --pretty=%B'),
  ['CurGitCommitSHA']       = os_exec('git rev-parse HEAD'),
  ['CurGitCommitSHAShort']  = os_exec('git rev-parse --short HEAD'),
  ['CurGitRepo']         = os_exec("git remote -v | awk '$3 ~ /fetch/{print $2}'"),
  ['CurGitRepoFriendly']    = function()
    local ret = string.gsub(vim.fnlocal.CurGitRepo(), 'https://github.com/', '')
    return string.gsub(ret, '.git$', '')
  end,
  ['CurGitRoot']         = os_exec('git rev-parse --show-toplevel'),
  ['CurHostname']        = os_exec('hostname -s'),
  ['CurHostId']          = os_exec('hostid'),
  ['CurKernel']          = os_exec('uname -r'),
  ['CurLine']            = partial(vim.fn.getline, '.'),
  ['CurLuaVersion']      = function()
    return string.gsub(_VERSION, '^Lua ', '') + 0.0
  end,
  ['CurMachineId']       = os_exec('cat /etc/machine-id'),
  ['CurNeovimVersion']   = vim.version,
  ['CurNeovimVersionMajor']   = function() return vim.version().major end,
  ['CurNeovimVersionMinor']   = function() return vim.version().minor end,
  ['CurPath']            = partial(vim.fn.expand, '%:p'),
  ['CurPublicIPAddress'] = os_exec('curl -fsSL "http://checkip.amazonaws.com/"'),
  ['CurUser']            = os_exec('id -un'),
  ['CurWord']            = partial(vim.fn.expand, '<cword>'),
  ['cwd']                = partial(vim.fn.getcwd),
  ['defined']            = function(arg)
    return not(arg == nil or arg == '')
  end,
  ['GetVisualSelection'] = partial(_G.GetVisualSelection),
  ['VisualSelectLastChange'] = partial(_G.VisualSelectLastChange),
  ['pwd']                = partial(vim.fn.getcwd),
}

for k, v in pairs(fnlocal) do
  vim.fnlocal[k] = v
end

