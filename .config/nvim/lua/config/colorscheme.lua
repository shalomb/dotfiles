-- setup must be called before loading the colorscheme

local vim = vim

-- -- Default options:
-- require("gruvbox").setup({
--   undercurl = true,
--   underline = true,
--   bold = true,
--   italic = true,
--   strikethrough = true,
--   invert_selection = false,
--   invert_signs = false,
--   invert_tabline = false,
--   invert_intend_guides = false,
--   inverse = true, -- invert background for search, diffs, statuslines and errors
--   contrast = "", -- can be "hard", "soft" or empty string
--   palette_overrides = {},
--   overrides = {},
--   dim_inactive = false,
--   transparent_mode = false,
-- })

vim.opt.laststatus = 3
vim.opt.fillchars:append({
    horiz = '━',
    horizup = '┻',
    horizdown = '┳',
    vert = '┃',
    vertleft = '┨',
    vertright = '┣',
    verthoriz = '╋',
})

local overrides = {
  VertSplit  = {
    fg = "#ffffff",
    bg = "#ffffff",
  },
  StatusLine = { bg = "#ffffff" }
}

require'kanagawa'.setup({
  overrides = overrides,
  globalStatus = true,
  transparent = true,
  dimInactive = true,
})

vim.cmd([[
let $NVIM_TUI_ENABLE_TRUE_COLOR=1
let g:gruvbox_contrast_dark = 'light'
let g:gruvbox_transparent_bg = 1
set background=dark
set termguicolors

augroup MyColorScheme
  autocmd VimEnter * ++nested colorscheme kanagawa " gruvbox
  autocmd VimEnter * hi! Normal ctermbg=none guibg=none
  autocmd VimEnter * hi! NormalFloat ctermbg=none guibg=none
augroup end
]])
