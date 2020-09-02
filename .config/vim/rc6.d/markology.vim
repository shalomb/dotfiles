let g:markology_include="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.'`^<>[]\""

let g:markology_textlower="\t"
let g:markology_textupper="\t"
let g:markology_textother="\t"

" From markology/autoload/markology.vim:64
" Highlighting: Setup some nice colours to show the mark positions.
hi default MarkologyHLLine cterm=underline gui=undercurl guisp=#007777
hi default MarkologyHLl    ctermfg=35 ctermbg=None cterm=None
hi default MarkologyHLo    ctermfg=35 ctermbg=None cterm=None
hi default MarkologyHLu    ctermfg=35 ctermbg=None cterm=None

" au VimEnter,BufWinEnter * :MarkologyEnable
" au VimLeave,BufWinLeave * :MarkologyDisable
