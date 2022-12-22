-- options

local options = vim.opt

options.cindent = true
options.backup = false
options.cmdheight = 2
options.visualbell = true
options.modeline = true
options.wildmode="longest,list,full"
-- options.completeopt="longest,menuone,preview" -- set by lsp-zero
-- TODO options.wildcharm="<C-Z>"
options.wildmenu = true
options.cursorline = true
options.expandtab = true
options.hlsearch = true
options.incsearch = true
options.modeline = true
options.mouse = nil
options.number = true
options.numberwidth = 2
options.hidden = true
options.relativenumber = true
options.scrolloff = 8
options.sidescroll = 16
options.shiftwidth = 2
options.softtabstop = 2
options.signcolumn = "yes"
options.showmatch = true
options.smartcase  = true
options.smartindent = true
options.smarttab = true
options.splitbelow = true
options.splitright = true
options.swapfile = true
options.tabstop = 2
options.textwidth = 100  -- linux kernel
options.undofile = true
options.updatetime = 50
options.undolevels = 8192
options.visualbell = true
options.viminfo = "'10,\"100,:256,%,n~/.local/vviminfo"

options.wildignore = {'*/cache/*', '*/tmp/*'}
-- options.errorformat:append('%f|%l col %c|%m')
options.listchars =  {eol = '↲', tab = '▸ ', trail = '·'}

-- local autocmd = vim.api.nvim_create_autoload
-- autocmd('TextYankPost', {pattern = '*', command = 'source $MYVIMRC'})

-- https://github.com/nanotee/nvim-lua-guide

vim.cmd([[
augroup jump_to_last_position
  autocmd!
  autocmd BufReadPost *
    \ if line("'\"") >= 1 && line("'\"") <= line("$") && &ft !~# 'commit'
    \ |   exe "normal! g`\""
    \ | endif
augroup end
]])
