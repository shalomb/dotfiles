" [VIM Spelling Suggestions with fzf | Codementor]
" (https://www.codementor.io/@coreyja/coreyja-vim-spelling-suggestions-with-fzf-p6ce3zb9a)

set spelllang=en_gb
let g:spelldir=expand(glob('~/') . '.config/vim/spell/')
let &spellfile=g:spelldir . '/' . substitute(&spelllang, '_.*', '', '') . '.' . &encoding . '.add'
set dictionary+=/usr/share/dict/words
set dictionary+=~/.config/dict/words
set thesaurus+=~/.config/dict/thesaurus
set complete-=k             " disable dictionary completion

if len(g:spelldir) == 0 || !isdirectory(g:spelldir)
  silent! execute '!mkdir -p ' . g:spelldir . ' > /dev/null'
endif

function! FzfSpellSink(word)
  exe 'normal! "_ciw'.a:word
endfunction

function! FzfSpell()
  let b:curword = CurWord()
  set spell
  let suggestions = spellsuggest(b:curword)
  return fzf#run(
    \{ 'source': suggestions,
    \  'sink': function("FzfSpellSink"),
    \  'down': 10,
    \  'options':
    \   '--border ' .
    \   '--cycle ' .
    \   '--extended ' .
    \   '--height=20 ' .
    \   '--inline-info ' .
    \   '--query="' . b:curword . '" ' .
    \   '--tac '
    \} )
endfunction

nnoremap z= :call FzfSpell()<CR>

highlight SpellBad cterm=underline ctermfg=black ctermbg=208
