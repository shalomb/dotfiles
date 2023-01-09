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
      \ substitute(expand('%'), glob('~/'), '~/', '') .. ' ' ..
      \ substitute(getcwd(), glob('~'), '~', '')
    \ )
]] )
end

local whichkey = require("which-key")
local telescope = require("telescope.builtin")

whichkey.register({
  name = "chords",

  ["#"] = { "#``", "*``" },
  ["'"] = { "`", "`" },
  ["*"] = { "*``", "*``" },
  ["`"] = { "'", "'" },
  ['$'] = { 'g_', "eol" },
  ['0'] = { function()
    local col = vim.fn.col('.')
    local line = vim.fn.getline('.')
    local lead = string.sub(line, 0, col - 1)
    local match = string.find(lead, '[^%s]')
    if match == nil then
      local beg = string.find(line, '[^%s]')
      if beg ~= nil and beg ~= col then
        vim.fn.cursor('.', beg)
      else
        vim.fn.feedkeys('g_')
      end
    else
      vim.fn.feedkeys('g^')
    end
  end, "bol" },
  ['^'] = { 'g0', "g0" },

  ["<c-d>"] = { "<C-d>zz", "down" },
  ['<c-b>'] = { '<c-b>zz', "backwards" },
  ["<c-e>"] = { "5<c-e>", "5 up" },
  ['<c-f>'] = { '<c-f>zz', "forwards" },
  ['<c-p>'] = { function()
    if vim.fnlocal.CurPath() ~= 'dotfiles' then
      telescope.find_files({ hidden = true })
    else
      telescope.find_files()
    end
  end, "find_files" },
  ["<c-u>"] = { "<c-u>zz", "up" },
  ["<c-w><c-w>"] = { "<C-W>p", "last window" },
  ["<c-y>"] = { "5<c-y>", "5 down" },

  ['g;'] = { 'g;zvzz', 'go to older change' },
  ["g,"] = { 'g,zvzz', "to to newer change" },
  ["gV"] = { _G.VisualSelectLastChange, "reselect last paste" },
  ['j'] = { 'gj', "gj" },
  ["J"] = { "mzJ`z", "join lines but stay put" },
  ['k'] = { 'gk', "gk" },
  ["n"] = { "nzzzv", "next match" },
  ["N"] = { "Nzzzv", "prev match" },
  ["."] = { ".`[", "repeat + go to last change" },
  ["Y"] = { "y$", "y$" },
  ["v"] = { "<c-v>", "<c-v>" },
  ["<cr>"] = { "<Nop>", "nop" },

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

}, { mode = "n", prefix = "" })

whichkey.register({
  name = "chords",
  ['#'] = { '<cmd>Commentary<cr>', 'Commentary' },
  ['//'] = { 'y/<C-R>"<CR>gv', 'put selected text in the search buffer' },
  ['<'] = { '<gv', 'move cursor to beg. of visual block' },
  ['>'] = { '>gv', 'move cursor to end  of visual block' },
  ['x'] = { 'x', 'x' }, -- to stop leap from claiming this
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
  ['ma'] = { [[:<c-u><c-r><c-r>='let @'. v:register .' = '. string(getreg(v:register))<cr><c-f><left>]], "edit macro?" },
  ['ms'] = { '<cmd>messages<cr>', ":messages" },
  ['mc'] = { '<cmd>messages clear<cr>', ":messages clear" },
  ["gr"] = { function()
    vim.cmd(string.format([[:grep %s]], vim.fnlocal.CurWord()))
  end,
    "grep selection" },
}, { mode = "n", prefix = "<leader>" })

whichkey.register({
  name = "pasties",
  p = {
    ["a'"] = { [["_da'P]], '' },
    ["i'"] = { [["_di'P]], '' },
    ['a"'] = { '"_da"P', '' },
    ['i"'] = { '"_di"P', '' },
    ['a{'] = { '"_da{P', '' },
    ['i{'] = { '"_di{P', '' },
    ['a}'] = { '"_da}P', '' },
    ['i}'] = { '"_di}P', '' },
    ['a('] = { '"_da(P', '' },
    ['i('] = { '"_di(P', '' },
    ['a)'] = { '"_da]P', '' },
    ['i)'] = { '"_di]P', '' },
    ['a['] = { '"_da[P', '' },
    ['i['] = { '"_di[P', '' },
    ['a]'] = { '"_da]P', '' },
    ['i]'] = { '"_di]P', '' },
    ['al'] = { '"_dalP', '' },
    ['il'] = { '"_dilP', '' },
    ['ap'] = { '"_dapP', '' },
    ['ip'] = { '"_dipP', '' },
    ['aW'] = { '"_daWP', '' },
    ['iW'] = { '"_diWP', '' },
    ['aw'] = { '"_dawP', '' },
    ['iw'] = { '"_diwP', '' },
  },
}, { mode = "n", prefix = "<leader>" })

whichkey.register({
  name = "pasties",
  ['p'] = { [["_dP]], "Paste last yank over visual selection" },
}, { mode = "x", prefix = "<leader>" })

whichkey.register({
  name = "quickies",
  ['gv'] = { [[<cmd>normal! gv<cr>]], "" },
}, { mode = "o", prefix = "" })

whichkey.register({
  name = "quickies",
  ['%%'] = { "<C-R>=fnameescape(expand('%:h:p')).'/'<space><cr>", "expand dir of curfile" },
  ['w!!'] = { [[%!SUDO_ASKPASS=$(which ssh-askpass) sudo -A tee % > /dev/null]], "write file out as root" },
  ['!!'] = { function()
  end, '' }
}, { mode = "c", prefix = "" })

-- cnoremap <expr> <c-n> wildmenumode() ? "\<c-n>" : "\<down>"
-- cnoremap <expr> <c-p> wildmenumode() ? "\<c-p>" : "\<up>"
map('i', '<c-w>', '<c-g>u<c-w>', { expr = false, desc = "" })
map('c', '<c-n>', '<down>', { expr = false })
map('c', '<c-p>', '<up>', { expr = false })

local invert = function(opt)
  vim.opt_local[opt] = not (vim.opt_local[opt]:get())
  vim.fn.OK((vim.opt_local[opt]:get() and '' or 'no') .. opt)
end

local cd = function(dir)
  if vim.fn.isdirectory(dir) then
    vim.fn.chdir(dir)
    vim.fn.OK(string.format('cd %s', dir))
  end
end

whichkey.register({

  ['"'] = { telescope.buffers, "Buffers" },
  ['#'] = { '<cmd>Commentary<cr>', 'Commentary' },

  ['a'] = { ':edit #<cr>', "edit alt" },
  ['ca'] = { vim.lsp.buf.code_action, "code action" },
  ['ls'] = { ':!less %<cr>', "less %" },
  ['on'] = { vim.cmd.only, "only" },
  ['rl'] = { ":source $MYVIMRC<cr>:lua vim.fn.OK(vim.fn.expand('$MYVIMRC') .. ' reloaded')<cr>", "reload" },
  ['so'] = { ":so<cr>:lua vim.fn.OK(vim.fn.expand('%') .. ' sourced')<cr>", "source" },
  ['u'] = { vim.cmd.UndotreeToggle, "UndotreeToggle" },
  ['w'] = { vim.cmd.update, "update" },

  c = {
    name = "cd",
    ["d"] = { function() cd(vim.fn.expand('%:h')) end, 'lcd local' },
    ["r"] = { function() cd(vim.fnlocal.CurGitRoot()) end, 'lcd root' },
  },

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
    f = { telescope.resume, "resume" },
    g = { function()
      vim.cmd([[
        :GkeepLogin
        :lua require('telescope').load_extension('gkeep')
        :Telescope gkeep
      ]])
    end, "gkeep" },
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
    },

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
  { desc = 'Search for term selected' })
map('i', '<Tab>', function()
  return vim.fn.pumvisible() == 1 and '<C-N>' or '<Tab>'
end, { expr = true })

-- vim:nowrap

-- References
-- https://github.com/ThePrimeagen/init.lua/blob/master/after/plugin/lsp.lua