-- options

local vim = vim
local options = vim.opt

-- TODO options.wildcharm="<C-Z>"
-- options.completeopt="longest,menuone,preview" -- set by lsp-zero
options.backup         = false
options.cindent        = true
options.cmdheight      = 2
options.cursorline     = true
options.expandtab      = true
options.hidden         = true
options.hlsearch       = true
options.incsearch      = true
options.modeline       = true
options.mouse          = nil
options.number         = true
options.numberwidth    = 2
options.relativenumber = true
options.scrolloff      = 8
options.shiftwidth     = 2
-- options.shortmess      = 'at'
options.showmatch      = true
options.sidescroll     = 16
options.signcolumn     = "yes"
options.smartcase      = true
options.smartindent    = true
options.smarttab       = true
options.softtabstop    = 2
options.splitbelow     = true
options.splitright     = true
options.swapfile       = true
options.tabstop        = 2
options.textwidth      = 100 -- linux kernel
options.undofile       = true
options.undolevels     = 8192
options.updatetime     = 50
options.viminfo        = "'10,\"100,:256,%,n~/.local/vviminfo"
options.visualbell     = true
options.wildmenu       = true
options.wildmode       = "longest,list,full"

options.wildignore = { '*/cache/*', '*/tmp/*' }
-- options.errorformat:append('%f|%l col %c|%m')
options.listchars = { eol = '↲', tab = '▸ ', trail = '·' }

-- local autocmd = vim.api.nvim_create_autoload
-- autocmd('TextYankPost', {pattern = '*', command = 'source $MYVIMRC'})

-- https://github.com/nanotee/nvim-lua-guide
