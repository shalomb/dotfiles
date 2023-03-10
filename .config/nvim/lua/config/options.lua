-- options

local vim = vim

-- TODO options.wildcharm="<C-Z>"
-- options.completeopt="longest,menuone,preview" -- set by lsp-zero
vim.opt.backup         = false
vim.opt.cindent        = true
vim.opt.clipboard      = 'unnamed'
vim.opt.cmdheight      = 2
vim.opt.complete       = ',w,b,u,t,i'
vim.opt.cursorline     = true
vim.opt.expandtab      = true
vim.opt.foldlevel      = 16
vim.opt.foldmethod     = 'indent'
vim.opt.hidden         = true
vim.opt.hlsearch       = true
vim.opt.incsearch      = true
vim.opt.modeline       = true
vim.opt.mouse          = nil
vim.opt.number         = true
vim.opt.numberwidth    = 3
vim.opt.relativenumber = true
vim.opt.scrolloff      = 8
vim.opt.shiftwidth     = 2
vim.opt.shortmess      = 'at'
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
vim.opt.tabstop        = 2
vim.opt.textwidth      = 100 -- linux kernel
vim.opt.undofile       = true
vim.opt.undolevels     = 8192
vim.opt.updatetime     = 50
vim.opt.viminfo        = "'10,\"100,:256,%,n~/.local/state/nvim/nviminfo"
vim.opt.visualbell     = true
vim.opt.wildmenu       = true
vim.opt.wildmode       = "longest,list,full"

vim.opt.wildignore = { '*/cache/*', '*/tmp/*' }
-- options.errorformat:append('%f|%l col %c|%m')
vim.opt.listchars = { eol = '↲', tab = '▸ ', trail = '·' }

-- local autocmd = vim.api.nvim_create_autoload
-- autocmd('TextYankPost', {pattern = '*', command = 'source $MYVIMRC'})

-- https://github.com/nanotee/nvim-lua-guide
