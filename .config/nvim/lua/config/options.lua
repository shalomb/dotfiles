-- options

local vim              = vim

-- TODO options.wildcharm="<C-Z>"

-- options.errorformat:append('%f|%l col %c|%m')

vim.opt.autoindent     = true
vim.opt.backup         = false
vim.opt.cindent        = true
vim.opt.clipboard      = 'unnamedplus'
vim.opt.cmdheight      = 2
vim.opt.complete       = 'w,b,u,t,i' -- leading empty flag dropped: NeoVim 0.12+ rejects it (E539 Illegal character <NUL>)
vim.opt.completeopt    = "longest,menu,menuone,preview,noinsert,noselect" -- set by lsp-zero
vim.opt.cursorline     = true
vim.opt.encoding       = "UTF-8"
vim.opt.expandtab      = true
-- vim.opt.foldmethod     = 'indent'
vim.opt.foldcolumn     = '1' -- '0' is not bad
vim.opt.foldenable     = true
-- Disabled treesitter folding to prevent "Index out of bounds" error with J command
-- vim.opt.foldexpr       = 'v:lua.vim.treesitter.foldexpr()'
vim.opt.foldlevel      = 20
vim.opt.foldlevelstart = 20
vim.opt.foldmethod     = 'indent'
vim.opt.formatoptions:append('1') -- don't break lines after one-letter words
vim.opt.formatoptions:append('c') -- auto-wrap comments on textwith
vim.opt.formatoptions:append('j') -- remove comment leader when joining lines
vim.opt.formatoptions:append('l') -- long lines are not broken in insert mode
vim.opt.formatoptions:append('o') -- insert comment leader on 'o/O' in normal mode
vim.opt.formatoptions:append('q') -- format comments with 'gq'
vim.opt.formatoptions:append('r') -- insert comment leader after <CR>
vim.opt.formatoptions:remove('a') -- auto format paragraphs
vim.opt.formatoptions:remove('n') -- recognize numbered lists
vim.opt.formatoptions:remove('t') -- remove autoindent on textwidth
vim.opt.formatprg      = 'par -jw79'
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
vim.opt.conceallevel   = 2   -- Required for Obsidian.nvim UI features (checkboxes, bullets, etc.)
vim.opt.termguicolors  = true
vim.opt.textwidth      = 100 -- linux kernel
vim.opt.title          = true
vim.opt.undofile       = true
vim.opt.undolevels     = 8192
vim.opt.updatetime     = 50
vim.opt.shada          = "'10,\"100,:256,%,n" .. vim.fn.expand("~/.local/state/nvim/nviminfo")
vim.opt.shadafile      = vim.fn.expand("~/.local/state/nvim/nviminfo")
vim.opt.visualbell     = true
vim.opt.wildignore     = { '*/cache/*', '*/tmp/*' }
vim.opt.wildmenu       = true
vim.opt.wildmode       = "longest,list,full"

-- https://github.com/nanotee/nvim-lua-guide
