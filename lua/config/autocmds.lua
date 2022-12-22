--

-- autoload lua files as soon as they are written to
vim.api.nvim_create_autocmd(
'BufWritePost', {
  pattern = '*/lua/config/*.lua',
  command = ':so'
})

