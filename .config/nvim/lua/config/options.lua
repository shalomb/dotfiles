-- options

local vim = vim

-- TODO options.wildcharm="<C-Z>"

-- options.errorformat:append('%f|%l col %c|%m')

vim.opt.formatoptions:remove('t')                                         -- text wrap autoindent

vim.opt.completeopt    = "longest,menu,menuone,preview,noinsert,noselect" -- set by lsp-zero
vim.opt.autoindent     = true
vim.opt.backup         = false
vim.opt.cindent        = true
vim.opt.clipboard      = 'unnamedplus'
vim.opt.cmdheight      = 1
vim.opt.complete       = ',w,b,u,t,i'
vim.opt.cursorline     = true
vim.opt.encoding       = "UTF-8"
vim.opt.expandtab      = true
vim.opt.foldlevel      = 16
vim.opt.foldmethod     = 'indent'
vim.opt.hidden         = true
vim.opt.hlsearch       = true
vim.opt.inccommand     = "split"
vim.opt.incsearch      = true
vim.opt.listchars      = { eol = '↲', tab = '▸ ', trail = '·' }
vim.opt.modeline       = true
vim.opt.mouse          = ""
vim.opt.number         = true
vim.opt.numberwidth    = 3
vim.opt.relativenumber = true
vim.opt.ruler          = true
vim.opt.scrolloff      = 8
vim.opt.shiftround     = true
vim.opt.shiftwidth     = 2
vim.opt.showcmd        = true
vim.opt.showmatch      = true
vim.opt.sidescroll     = 16
vim.opt.signcolumn     = "yes"
vim.opt.smartcase      = true
vim.opt.smartindent    = true
vim.opt.smarttab       = true
vim.opt.softtabstop    = 2
vim.opt.splitbelow     = true
vim.opt.splitright     = true
vim.opt.swapfile       = true
vim.opt.syntax         = "on"
vim.opt.tabstop        = 2
vim.opt.termguicolors  = true
vim.opt.textwidth      = 100 -- linux kernel
vim.opt.title          = true
vim.opt.undofile       = true
vim.opt.undolevels     = 8192
vim.opt.updatetime     = 50
vim.opt.viminfo        = "'10,\"100,:256,%,n~/.local/state/nvim/nviminfo"
vim.opt.visualbell     = true
vim.opt.wildignore     = { '*/cache/*', '*/tmp/*' }
vim.opt.wildmenu       = true
vim.opt.wildmode       = "longest,list,full"

-- https://github.com/nanotee/nvim-lua-guide
