--

local vim = vim

-- autoload lua files as soon as they are written to
vim.api.nvim_create_autocmd(
'BufWritePost', {
  pattern = '*/lua/config/*.lua',
  command = ':so'
})

vim.cmd([[
augroup jump_to_last_position
  autocmd!
  autocmd BufReadPost *
    \ if line("'\"") >= 1 && line("'\"") <= line("$") && &ft !~# 'commit'
    \ |   exe "normal! g`\""
    \ | endif
augroup end
]])
