""" Autocommands helper """""""""""""""""""""""""""""""""""""""""""""""

function! s:AuRsyncTargetCompletion(ArgLead, CmdLine, CursorPos)
  let l:cmdline = getcmdline()
  let l:char_at_pos = a:CmdLine[a:CursorPos-1]

  if char_at_pos ==# ':'
    return join( map( split(expand('%'), '\n'), '"' . a:ArgLead . '"' . ' . v:val' ), '\n')
  elseif char_at_pos ==# ' '
    return system("perl -lne '($h)=/Host +([^\*]+)$/i; print for split /\\s+/, $h' ~/.ssh/*config* ~/.ssh/config.d/*")
  else
    return system("perl -lne '($h)=/Host +([^\*]+)$/i; print for grep /^" . a:ArgLead . "/, split /\\s+/, $h' ~/.ssh/*config* ~/.ssh/config.d/*")
  endif

endfunction

function! NormalizeWS(v)
  return join(split(v:val, ' '), ' ')
endfunction

function! AuStartCmdHistoryEditing(...)

  if a:0 <= 1
    throw 'Expecting more than 1 argument'
    return 0
  endif

  let l:subcmd   = a:1
  let l:subcmd_target = join( map(a:000[1:], 'NormalizeWS(v:val)') , ' ')

  let l:feed_keys = 'q:Gk$'

  if l:subcmd ==# 'AuRsyncFile'
    let l:hist_args = [
      \  'au BufWritePost,FileWritePost <buffer> silent',
      \  ':!',
      \  '&>/dev/null',
      \    'rsync -a % ' . l:subcmd_target,
      \ ]

  elseif l:subcmd ==# 'AuRsyncGitProject'
    let l:git_root = GitRoot()
    let l:hist_args = [
      \  'au BufWritePost,FileWritePost * silent',
      \  ':!(',
      \    'cd ' . l:git_root,
      \    '&&',
      \    '&>/dev/null',
      \      'rsync -a --exclude=.git/',
      \        l:git_root     . '/',
      \        l:subcmd_target . '/',
      \  ')'
      \ ]
    let l:feed_keys = 'q:Gk?' . l:subcmd . 'j$F/'

  elseif l:subcmd ==# 'AuRunCommand'
    let l:hist_args = [
      \  'au BufWritePost,FileWritePost * silent',
      \  ':!(',
      \    l:subcmd_target . ';',
      \  ')'
      \ ]
    let l:feed_keys = 'q:Gk$F;'

  elseif l:subcmd ==# 'AuRunGitCommand'
    let l:git_root = GitRoot()
    let l:hist_args = [
      \  'au BufWritePost,FileWritePost * silent',
      \  ':!(',
      \    'cd ' . l:git_root,
      \    '&&',
      \    l:subcmd_target . ';',
      \  ')'
      \ ]
    let l:feed_keys = 'q:Gk$F&w'

  elseif l:subcmd ==# 'AuRunTmuxCommand'

    try
      let l:target_directory = GitRoot()
    catch /.*/
      let l:target_directory = expand('%:p:h')
    endtry

    let l:hist_args = [
      \  'au BufWritePost,FileWritePost * silent',
      \    ':Tmux (',
      \      'cd ' . l:target_directory,
      \      '&&',
      \      l:subcmd_target . ';',
      \    ')'
      \ ]
    let l:feed_keys = 'q:Gk$F&w'

  else
    throw 'Unknown subcommand "' . l:subcmd . '"'
    return 0
  endif

  try
    call histadd('cmd', join(l:hist_args, ' '))
    call feedkeys(l:feed_keys, 'in')
  catch /.*/
    echoerr 'Error executing "' . l:subcmd . '" ' . v:exception
  endtry

endfunction

command! -complete=custom,s:AuRsyncTargetCompletion -nargs=1
  \ AuRsyncFile       call AuStartCmdHistoryEditing('AuRsyncFile', <q-args>)

command! -complete=custom,s:AuRsyncTargetCompletion -nargs=1
  \ AuRsyncGitProject call AuStartCmdHistoryEditing('AuRsyncGitProject', <q-args>)

command! -nargs=*
  \ AuRunCommand      call AuStartCmdHistoryEditing('AuRunCommand', <q-args>)

command! -nargs=*
  \ AuRunGitCommand   call AuStartCmdHistoryEditing('AuRunGitCommand', <q-args>)

command! -nargs=*
  \ AuRunTmuxCommand  call AuStartCmdHistoryEditing('AuRunTmuxCommand', <q-args>)
