" https://github.com/junegunn/fzf/wiki/Examples-(vim)#fuzzy-search-files-in-parent-directory-of-current-file

function! s:launch_file(file)
  exe 'edit ' . a:file
  silent! exe 'syntax on'
  silent! exe 'hi Normal ctermbg=NONE'
endfunction

function! s:fzf_neighbouring_files()
  let current_file =expand("%")
  let cwd = fnamemodify(current_file, ':p:h')
  let command = 'ack --no-color -g . '

  call fzf#run({
    \   'dir': cwd,
    \   'source': command,
    \   'sink':   function('s:launch_file'),
    \   'window':  'enew',
    \   'options':
    \     '--border ' .
    \     '--no-sort ' .
    \     '--cycle ' .
    \     '--extended ' .
    \     '--height=100 ' .
    \     '--inline-info ' .
    \     '--select-1 ' .
    \     '--tac '
    \   }
    \ )
endfunction

command! FZFNeighbours call s:fzf_neighbouring_files()
