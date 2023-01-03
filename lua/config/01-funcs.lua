-- lua

local vim = vim

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

vim.cmd([[
function! VisualSelectLastChange()
  let vr = getregtype(v:register)[0]
  call feedkeys("`[" . vr . "`]")
endfunction
]])

vim.cmd([[
function! GetVisualSelection()
  " Why is this not a built-in Vim script function?!
  let [line_start, column_start] = getpos("'<")[1:2]
  let [line_end, column_end] = getpos("'>")[1:2]
  let lines = getline(line_start, line_end)
  if len(lines) == 0
    return ''
  endif
  let lines[-1] = lines[-1][: column_end - (&selection ==# 'inclusive' ? 1 : 2)]
  let lines[0] = lines[0][column_start - 1:]
  return join(lines, "\n")
endfunction
]])

local func = function(func, args)
  return function()
    if vim.fnlocal.defined(args) then
      return func(args)
    else
      return func()
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
  ['CurDateC']           = func(vim.fn.strftime, '%c'),
  ['CurDate']            = func(vim.fn.strftime, '%FT%T'),
  ['CurDateRfc3389']     = func(vim.fn.strftime, '%FT%T%z'),
  ['CurDateZ']           = func(vim.fn.strftime, '%F %T%z'),
  ['CurExpr']            = func(vim.fn.expand, '<cexpr>'),
  ['CurFileDirectory']   = func(vim.fn.expand, '%:p:h'),
  ['CurFile']            = func(vim.fn.expand, '%:t'),
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
  ['CurLine']            = func(vim.fn.getline, '.'),
  ['CurLuaVersion']      = function()
    return string.gsub(_VERSION, '^Lua ', '') + 0.0
  end,
  ['CurMachineId']       = os_exec('cat /etc/machine-id'),
  ['CurNeovimVersion']   = vim.version,
  ['CurNeovimVersionMajor']   = function() return vim.version().major end,
  ['CurNeovimVersionMinor']   = function() return vim.version().minor end,
  ['CurPath']            = func(vim.fn.expand, '%:p'),
  ['CurPublicIPAddress'] = os_exec('curl -fsSL "http://checkip.amazonaws.com/"'),
  ['CurUser']            = os_exec('id -un'),
  ['CurWord']            = func(vim.fn.expand, '<cword>'),
  ['cwd']                = func(vim.fn.getcwd),
  ['defined']            = function(arg)
    return not(arg == nil or arg == '')
  end,
  ['GetVisualSelection'] = func(vim.fn.GetVisualSelection),
  ['VisualSelectLastChange'] = func(vim.fn.VisualSelectLastChange),
  ['pwd']                = func(vim.fn.getcwd),
}

for k, v in pairs(fnlocal) do
  vim.fnlocal[k] = v
end

