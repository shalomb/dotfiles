" Convenience wrapper around fzf#run to list files

function! LaunchFile(file)
  exe 'edit ' . a:file
  silent! exe 'syntax on'
  silent! exe 'hi Normal ctermbg=NONE'
endfunction

function! FZFFileLister(...)
  let s:dir    = get(a:, 0, '.')
  let s:source = get(a:, 1, 'find * -type f')
  let s:query  = get(a:, 2, '')
  return fzf#run({
    \   'dir':     s:dir,
    \   'source':  s:source,
    \   'sink':    function('LaunchFile'),
    \   'window':  'enew',
    \   'options': FZFPreviewOptions('--query=' . s:query)
    \   }
    \ )
endfunction

function! FZFPreviewOptions(...)
  " return a list of fzf (default) options to the caller
  " with any they would like to override
  return [
    \    '--border',
    \    '--no-sort',
    \    '--cycle',
    \    '--extended',
    \    '--height=100',
    \    '--info=inline',
    \    '--tac'
    \  ]
    \ + a:000
endfunction
