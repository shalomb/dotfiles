" Emulate bash's Word Designators completion on the previous :ex command

" cnoremap <expr> !!                    @:
cnoremap <expr> !:$                   split(@:, ' ')[-1]
cnoremap <expr> !$                    split(@:, ' ')[-1]
cnoremap <expr> !0                    split(@:, ' ')[0]
cnoremap <expr> !*                    join(split(@:, ' ')[1:], ' ')
