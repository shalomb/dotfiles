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

-- local M = {}

-- function M.map(mode, lhs, rhs, opts)
--     local options = { noremap = true }
--     if opts then
--         options = vim.tbl_extend("force", options, opts)
--     end
--     vim.api.nvim_set_keymap(mode, lhs, rhs, options)
-- end

-- return M

-- map('n', '-', vim.cmd.Vex)

map('n', '0', '^')
map('n', '<c-b>', '<c-b>zz')
map("n", "<C-d>", "<C-d>zz")
map('n', '<c-f>', '<c-f>zz')
map("n", "<C-u>", "<C-u>zz")
map('n', '^', 'g0')
map('n', 'g,', 'g;zvzz')
map('n', 'g;', 'g;zvzz')  -- go to older position in change list
map('n', 'j', 'gj')
map("n", "J", "mzJ`z")
map('n', 'k', 'gk')
map('n', '<leader>?', ":lua require'hop'.hint_patterns({}, vim.fn.getreg('/'))<cr>")
map('n', '<leader>a', ':edit #<cr>')
map('n', '<leader>ca', vim.lsp.buf.code_action)
map('n', '<leader><leader>', ":update<cr>:call ShowCrossHairs('20m')<cr>:lua vim.fn.updatemsg()<cr>")
map('n', '<leader>j', ':HopLineMW<cr>')
map('n', '<leader>k', ':HopLineMW<cr>')
map('n', '<leader>ls', ':!less %<cr>')
map('n', '<leader>on', vim.cmd.only)
map('n', '<leader>on', vim.cmd.only)
map('n', '<leader>q', vim.cmd.quit)
map('n', '<leader>rl', ":source $MYVIMRC<cr>:lua vim.fn.OK(vim.fn.expand('$MYVIMRC') .. ' reloaded')<cr>")
map('n', '<leader>so', ":so<cr>:lua vim.fn.OK(vim.fn.expand('%') .. ' sourced')<cr>")
map('n', '<leader>td', ":lua require('todo').qf_todo()<cr>:copen<cr>")
map('n', '<leader>u', vim.cmd.UndotreeToggle)
map('n', '<leader>"', vim.cmd.Buffers)
map('n', '<leader>w', vim.cmd.update)
map("n", "n", "nzzzv")
map("n", "N", "Nzzzv")
-- map("n", "S", [[:%s/\<<C-r>/\>/<C-r><C-w>/gI<Left><Left><Left>]])
-- map('n', '*', '*zz', {desc = 'Search and center screen'})
map("v", "J", ":m '>+1<CR>gv=gv")
map("v", "K", ":m '<-2<CR>gv=gv")

map("x", "<leader>p", [["_dP]], {desc = 'Paste last yank over visual selection'}) -- greatest remap ever

map('v', '<leader>/', ':<c-u>lua vim.b.visual_selection=vim.fnlocal.GetVisualSelection()<cr>' ..
                      ':grep <c-r>=fnameescape(expand(b:visual_selection))<c-j>',
                      {desc = 'Search for term selected'})
map('i', '<Tab>', function()
  return vim.fn.pumvisible() == 1 and '<C-N>' or '<Tab>'
end, {expr = true})

-- vim:nowrap

-- References
-- https://github.com/ThePrimeagen/init.lua/blob/master/after/plugin/lsp.lua
