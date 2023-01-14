# Todo

tag management
- copilot
- ChatGPT
- :Projects
  switch to foreign project directories
- :Tips
- completion a la traditional vim with words from buffers first
- add neovim directories to lsp workspace for completion
- lualine filename
- write telescope plugin for finding/returing files
```
    pickers = {
      find_files = {
        find_command = {"rg", "--files", "--hidden", "--ignore", "-u", "--glob=!**/.git/*", "--glob=!**/node_modules/*"},
      }
    },
```
- custom formatters/linters
  - efm / tflint / tfsec / terrascan

```
require("telescope.builtin").find_files({search_dirs = {first_arg}, hidden = true})
```

- useful keymaps
- https://www.reddit.com/r/vim/comments/8k4p6v/what_are_your_best_mappings/

filename not prominent in statusline when using multiple windows

- null-ls

markdown
ansible
terraform

## ideas

Running commands in remote tmux window
tmux-sessionizer
tmux-windowizer

```sh
tmux send-keys -t mySession.0 "echo 'Hello World'" ENTER
```

# tips

```
:lua =vim.version
:lua =jit.version
:echo stdpath("cache")
```


