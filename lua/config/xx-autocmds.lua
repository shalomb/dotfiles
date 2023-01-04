--

local vim = vim

vim.api.nvim_create_augroup("bufcheck", { clear = true })

-- autoload config files as soon as they are written to
vim.api.nvim_create_autocmd(
  { "BufWritePost", "FileWritePost" }, {
  group = 'bufcheck',
  pattern = { '*/lua/config/*.lua', '*/lua/config/*.vim', vim.env.MYVIMRC },
  callback = function()
    vim.cmd([[:source <afile>]])
    print('\n')
    vim.fn.OK(vim.fn.expand('%') .. ' sourced')
  end,
})

-- vim.cmd([[
-- augroup jump_to_last_position
--   autocmd!
--   autocmd BufReadPost *
--     \ if line("'\"") >= 1 && line("'\"") <= line("$") && &ft !~# 'commit'
--     \ |   exe "normal! g`\""
--     \ | endif
-- augroup end
-- ]])

vim.api.nvim_create_autocmd('BufReadPost', {
  group    = 'bufcheck',
  pattern  = '*',
  callback = function()
    local ft = vim.opt_local.filetype:get()
    if vim.fn.line("'\"") > 0 and
        vim.fn.line("'\"") <= vim.fn.line("$") and
        not(string.match(ft, "commit")) and
        not(string.match(ft, "fugitive"))
    then
      vim.fn.setpos('.', vim.fn.getpos("'\""))
      -- vim.api.nvim_feedkeys([[g`"]], 'n', true)
    end
  end
})

vim.api.nvim_create_autocmd(
  { 'BufEnter', 'InsertLeave', 'CmdWinLeave', 'CmdlineLeave' }, {
  group   = 'bufcheck',
  pattern = '*',
  command = 'set nu rnu cursorline'
})

vim.api.nvim_create_autocmd(
  { 'BufLeave', 'InsertEnter', 'CmdWinEnter', 'CmdlineEnter' }, {
  group   = 'bufcheck',
  pattern = '*',
  command = 'set nu nornu nocursorline'
})

-- extraneous whitespace
vim.api.nvim_set_hl(0, 'ExtraneousWhitepsace', { bg = 'red', underline = false })
local ew_group = vim.api.nvim_create_augroup('extraneous_whitespace', { clear = true })

vim.api.nvim_create_autocmd(
  { 'BufEnter', 'InsertLeave' }, {
  group = ew_group,
  callback = function()
    vim.fn.matchadd('extraneous_whitespace', '/\\v(\\S\zs\\s+$| +\\zs\\t|\\t\\ze +)/')
  end
})

vim.api.nvim_create_autocmd(
  { 'InsertEnter' }, {
  group = ew_group,
  callback = function()
    vim.fn.matchadd('extraneous_whitespace', '/\\v\\s+\\%#\\@<!$/')
  end
})

vim.api.nvim_create_autocmd(
  { 'BufCreate', 'BufWritePre' }, {
  group = ew_group,
  callback = function()
    vim.cmd([[:silent! %s/\v\s+$//ge]])
  end
})
