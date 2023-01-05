# Todo

- todo not recursive :|
- completion a la traditional vim with words from buffers first
- add neovim directories to lsp workspace for completion
- lualine filename

- write telescope plugin for finding/returing files

```
require("telescope.builtin").find_files({search_dirs = {first_arg}, hidden = true})
```

- useful keymaps
- https://www.reddit.com/r/vim/comments/8k4p6v/what_are_your_best_mappings/

lsp completion for functions missing

switch to foreign project directories

ctrl-k conflict with lsp
filename not prominent in statusline when using multiple windows

google keep
copilot

- efm / tflint / tfsec / terrascan
- null-ls
- custom formatters/linters

markdown
ansible
terraform

## ideas

Running commands in remote tmux window

```sh
tmux send-keys -t mySession.0 "echo 'Hello World'" ENTER
```

tmux-sessionizer
tmux-windowizer

tag management

# tips

```
:lua =vim.version
:lua =jit.version
```
