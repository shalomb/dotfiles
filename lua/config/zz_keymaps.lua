-- keymaps

local vim = vim

local map = vim.keymap.set
-- local opt = { noremap = true, silent = true }

vim.cmd([[
augroup keymaps_reload
  autocmd!
  autocmd BufWritePost zz_keymaps.lua :so
augroup end
]])

vim.fn.updatemsg = function()
  vim.cmd([[
    echohl DiagnosticHint
    echon "OK: "
    echohl None
    echon(
      \ strftime('%T') .. ': ' ..
      \ substitute(expand('%:p'), glob('~/'), '~/', '') .. ' ' ..
      \ substitute(getcwd(), glob('~'), '~', '')
    \ )
]])
end

-- map('n', '-', vim.cmd.Vex)

map("v", "J", ":m '>+1<CR>gv=gv")
map("v", "K", ":m '<-2<CR>gv=gv")

vim.keymap.set("n", "J", "mzJ`z")
vim.keymap.set("n", "<C-d>", "<C-d>zz")
vim.keymap.set("n", "<C-u>", "<C-u>zz")
vim.keymap.set("n", "n", "nzzzv")
vim.keymap.set("n", "N", "Nzzzv")

-- greatest remap ever
map("x", "<leader>p", [["_dP]])

map('n', '<leader>q', vim.cmd.quit)
map("n", "S", [[:%s/\<<C-r>/\>/<C-r><C-w>/gI<Left><Left><Left>]])

map('n', '<c-b>', '<c-b>zz')
map('n', '<c-f>', '<c-f>zz')
map('n', 'g,', 'g;zvzz')
map('n', 'g;', 'g;zvzz')  -- go to older position in change list
map('n', '<leader>a', ':edit #<cr>')
map('n', '<leader><leader>', ":update<cr>:call ShowCrossHairs('20m')<cr>:lua vim.fn.updatemsg()<cr>")
map('n', '<leader>"', vim.cmd.Buffers)
map('n', '<leader>w', vim.cmd.update)
map('n', '<leader>i', ':echo("hi mom")')
map('n', '<leader>ls', ':!less %<cr>')
map('n', '<leader>ca', vim.lsp.buf.code_action)
map('n', '<leader>q', vim.cmd.quit)
map('n', '<leader>u', vim.cmd.UndotreeToggle)
map('n', '<leader>rl', ":source $MYVIMRC<cr>:lua vim.fn.OK(vim.fn.expand('$MYVIMRC') .. ' reloaded')<cr>")
map('n', '<leader>so', ":so<cr>:lua vim.fn.OK(vim.fn.expand('%') .. ' sourced')<cr>")
-- map('n', '*', '*zz', {desc = 'Search and center screen'})
map('v', '<leader>/', ':<c-u>Rg <c-r>=fnameescape())<c-j><c-j>', {desc = 'Search for term selected'})

map('i', '<Tab>', function()
  return vim.fn.pumvisible() == 1 and '<C-N>' or '<Tab>'
end, {expr = true})

-- vim:nowrap

-- References
-- https://github.com/ThePrimeagen/init.lua/blob/master/after/plugin/lsp.lua
