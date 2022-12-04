" Shorthands for frequently used ctrl-r + " expressions

function! CurArch()
  if systemlist('uname -m')[0] == 'x86_64'
    return 'amd64'
  elseif systemlist('uname -m')[0] == 'x86'
    return '386'
  else
    return 'unknown'
  endif
endfunction

function! CurDate()
  return strftime('%FT%T')
endfunction

function! CurDateC()
  return strftime('%c')
endfunction

function! CurDateRfc3339()
  return strftime('%F %T%z')
endfunction

function! CurDateZ()
  return strftime('%FT%T%z')
endfunction

function! CurExpr()
  return expand("<cexpr>")
endfunction

function! CurFile()
  return expand("%:t")
endfunction

function! CurFileDirectory()
  return expand("%:p:h")
endfunction

function! CurFileFull()
  return expand("%:p")
endfunction

function! CurDirectory()
  return systemlist('pwd')[0]
endfunction

function! CurGitProjectRoot(...)
  let root = systemlist('git rev-parse --show-toplevel')[0]
  if root 
    return root
  else
    if a:0
      return a:1
    endif
  endif
  echoerr('We are not in a git project directory!!')
endfunction

function! CurGitBranch()
  return systemlist('git rev-parse --abbrev-ref HEAD')[0]
endfunction

function! CurGitCommit()
  return systemlist('git rev-parse HEAD')[0]
endfunction

function! CurGitCommitShort()
  return systemlist('git rev-parse --short HEAD')[0]
endfunction

function! CurProductUUID()
  return systemlist('cat /sys/class/dmi/id/product_uuid')[0]
endfunction

function! CurMachineID()
  return systemlist('cat /etc/machine-id')[0]
endfunction

function! CurHostid()
  return systemlist('hostid')[0]
endfunction

function! CurHostname()
  return systemlist('hostname')[0]
endfunction

function! CurLine()
  return getline(".")
endfunction

function! CurOS()
  return tolower(CurSystem() . '/' . CurArch())
endfunction

function! CurSystem()
  return systemlist('uname -s')[0]
endfunction

function! CurPublicIPAddress()
  return systemlist('curl -fsSL "http://checkip.amazonaws.com/"')[0]
endfunction

function! CurNode()
  return systemlist('uname -n')[0]
endfunction

function! CurUser()
  return systemlist('id -un')[0]
endfunction

function! CurWord()
  return expand("<cword>")
endfunction

