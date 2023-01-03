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

local whichkey = require("which-key")
local telescope = require("telescope.builtin")

whichkey.register({
  name = "chords",
  ["'"] = { "`", "`" },
  ["`"] = { "'", "'" },
  ['0'] = { '^', "" },
  ['<c-b>'] = { '<c-b>zz', "backwards" },
  ["<c-d>"] = { "<C-d>zz", "down" },
  ['<c-f>'] = { '<c-f>zz', "forwards" },
  ['#'] = { '<cmd>Commentary<cr>', 'Commentary' },
  ['<c-p>'] = { function() telescope.find_files() end, "find_files" },
  ["<c-u>"] = { "<c-u>zz", "up" },
  ["<c-e>"] = { "5<c-e>", "5 up" },
  ["<c-y>"] = { "5<c-y>", "5 down" },
  ["<C-W><C-W>"] = { "<C-W>p", "last window" },
  ['^'] = { 'g0', "g0" },
  ['g;'] = { 'g;zvzz',  'go to older change' },
  ["g,"] = { 'g,zvzz', "to to newer change" },
  ["gV"] = { _G.VisualSelectLastChange, "reselect last paste" },
  ['j'] = { 'gj', "gj" },
  ["J"] = { "mzJ`z", "join lines but stay put" },
  ['k'] = { 'gk', "gk" },
  ['<leader>a'] = { ':edit #<cr>', "edit alt" },
  ['<leader>ca'] = { vim.lsp.buf.code_action, "code action" },
  ['<leader>ls'] = { ':!less %<cr>', "less %" },
  ['<leader>on'] = { vim.cmd.only, "only" },
  ['<leader>rl'] = { ":source $MYVIMRC<cr>:lua vim.fn.OK(vim.fn.expand('$MYVIMRC') .. ' reloaded')<cr>", "reload" },
  ['<leader>so'] = { ":so<cr>:lua vim.fn.OK(vim.fn.expand('%') .. ' sourced')<cr>", "source" },
  ['<leader>"'] = { telescope.buffers, "Buffers" },
  ['<leader>u'] = { vim.cmd.UndotreeToggle, "UndotreeToggle" },
  ['<leader>w'] = { vim.cmd.update, "update" },
  ["n"] = { "nzzzv", "next match" },
  ["N"] = { "Nzzzv", "prev match" },
  ["."] = { ".`[", "repeat + go to last change" },
  ["Y"] = { "y$", "y$" },
  ["v"] = { "<c-v>", "<c-v>" },

  ["gh"] = {
    function()
      vim.fn.chdir(vim.fn.expand('%:h'))
      vim.fn.OK(vim.fn.getcwd())
    end, "go home to git root"
  },
  ["gH"] = {
    function()
      vim.fn.chdir(vim.fnlocal.CurGitRoot())
      vim.fn.OK(vim.fn.getcwd())
    end, "go home to git root"
  },
  ["_"] = { function()
    local pwd = vim.fn.getcwd()
    vim.fn.chdir(vim.fnlocal.CurGitRoot())
    vim.api.nvim_input("-") -- call to vinegar
    vim.fn.chdir(pwd)
  end, "launch vinegar in git root" },

}, { mode = "n", prefix = "" } )

whichkey.register({
  name = "chords",
  ['#'] = { '<cmd>Commentary<cr>', 'Commentary' },
  ['<'] = { '<gv', 'move cursor to beg. of visual block' },
  ['>'] = { '>gv', 'move cursor to end  of visual block' },
  ['//'] = { 'y/<C-R>"<CR>gv', 'put selected text in the search buffer' },
  ['z/'] = { 'y/<C-R>"<CR>gv', 'put selected text in the search buffer' },
}, { mode = "v", prefix = "" })

whichkey.register({
  name = "chords",
  ['#'] = { '<cmd>Commentary<cr>', 'Commentary' },
}, { mode = "v", prefix = "<leader>" })

whichkey.register({
  name = "quickies",
  ['<leader>'] = { ":update<cr>:call ShowCrossHairs('20m')<cr>:lua vim.fn.updatemsg()<cr>", "update" },
  ["q"] = { vim.cmd.quit, "quit" },
  ['w'] = { vim.cmd.update, "update" },
  ['/'] = { telescope.live_grep, "live_grep" },
  ['m'] = { [[:<c-u><c-r><c-r>='let @'. v:register .' = '. string(getreg(v:register))<cr><c-f><left>]], "edit macro?" },
  ["gr"] = { function()
      vim.cmd(string.format([[:grep %s]], vim.fnlocal.CurWord()))
    end,
    "grep selection" },
}, { mode = "n", prefix = "<leader>" } )

whichkey.register({
  name = "quickies",
  ['p'] = { [["_dP]], "Paste last yank over visual selection" },
}, { mode = "x", prefix = "<leader>" } )

whichkey.register({
  name = "quickies",
  ['gv'] = { [[<cmd>normal! gv<cr>]], "" },
}, { mode = "o", prefix = "" } )

whichkey.register({
  name = "quickies",
  ['%%'] = { "<C-R>=fnameescape(expand('%:h:p')).'/'<space><cr>", "expand dir of curfile" },
  ['w!!'] = { [[%!SUDO_ASKPASS=$(which ssh-askpass) sudo -A tee % > /dev/null]], "write file out as root" },
}, { mode = "c", prefix = "" } )

-- cnoremap <expr> <c-n> wildmenumode() ? "\<c-n>" : "\<down>"
-- cnoremap <expr> <c-p> wildmenumode() ? "\<c-p>" : "\<up>"
map('i', '<c-w>', '<c-g>u<c-w>', {expr = false, desc = ""})
map('c', '<c-n>', '<down>', {expr = false})
map('c', '<c-p>', '<up>', {expr = false})

local invert = function(opt)
	vim.opt_local[opt] = not(vim.opt_local[opt]:get())
	vim.fn.OK((vim.opt_local[opt]:get() and '' or 'no') .. opt)
end

whichkey.register({
  i = {
    name = "inversions",
    p = { function() invert('paste') end, 'invert paste' },
    s = { function() invert('spell') end, 'invert spell' },
    x = { function() invert('cursorline'); invert('cursorcolumn') end, 'invert cursorline/column' },
  },
  t = {
    name = "two-step",

    b = { telescope.buffers, "buffers" },
    c = { telescope.commands, "commands" },
    d = { ":lua require('todo').qf_todo()<cr>:copen<cr>", "copen todos" },
    f = { telescope.resume, "resume" },
    h = { telescope.help_tags, "help_tags" },
    m = { telescope.marks, "marks" },
    -- s = { ':lua <Plug>NormalModeSendToTmux', "SendSelectionToTmux" },
    s = { '<Plug>SendSelectionToTmux', "SendSelectionToTmux" },
    t = { '<cmd>TagbarToggle<cr>', "TagbarToggle" },
    v = { '<Plug>SetTmuxVars', "SetTmuxVars" },

    z = {
      name = "zebra",
      n = {
        function()
          print('zebra from tanzania')
        end,
        "zebra from tanzania"
      }
    }

  }

}, { mode = "n", prefix = "<leader>" })

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

-- map("n", "S", [[:%s/\<<C-r>/\>/<C-r><C-w>/gI<Left><Left><Left>]])
-- map('n', '*', '*zz', {desc = 'Search and center screen'})
map("v", "J", ":m '>+1<CR>gv=gv")
map("v", "K", ":m '<-2<CR>gv=gv")

-- map("x", "<leader>p", [["_dP]], {desc = 'Paste last yank over visual selection'}) -- greatest remap ever

map('v', '<leader>/', ':<c-u>lua vim.b.visual_selection=vim.fnlocal.GetVisualSelection()<cr>' ..
                      ':grep <c-r>=fnameescape(expand(b:visual_selection))<c-j>',
                      {desc = 'Search for term selected'})
map('i', '<Tab>', function()
  return vim.fn.pumvisible() == 1 and '<C-N>' or '<Tab>'
end, {expr = true})

-- vim:nowrap

-- References
-- https://github.com/ThePrimeagen/init.lua/blob/master/after/plugin/lsp.lua
