" detector for ansible

fun! s:DetectAnsible()
   if getline(1) ==# '#!/usr/bin/env ansible-playbook'
     set filetype=yaml.ansible
   endif
endfun

augroup yaml_ansible
  au!
  autocmd BufNewFile,BufRead *.yaml,*.yml call s:DetectAnsible()
augroup end
