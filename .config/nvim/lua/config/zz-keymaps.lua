-- local api = require('Comment.api')

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
]])
end

local whichkey = require("which-key")
local telescope = require("telescope.builtin")

local invert = function(opt)
  vim.opt_local[opt] = not (vim.opt_local[opt]:get())
  vim.fn.OK((vim.opt_local[opt]:get() and '' or 'no') .. opt)
end

vim.fn.cd = function(dir)
  if vim.fn.isdirectory(dir) then
    vim.fn.chdir(dir)
    vim.fn.OK(string.format('cd %s', vim.fn.resolve(dir)))
  else
    vim.fn.NOK(string.format('Not a directory %s', dir))
  end
end

local my_live_grep = function(pat)
  -- TODO - Telescope live_grep default_text=foo
  -- https://www.reddit.com/r/neovim/comments/wprod1/comment/ikicotz/
  -- https://github.com/nvim-telescope/telescope.nvim/issues/2095#issuecomment-1193068381
  local actions = require "telescope.actions"
  local builtin = require("telescope.builtin")
  local action_state = require('telescope.actions.state')
  local action_set = require('telescope.actions.set')

  -- perform a live_grep
  -- but preserve the search pattern so that n,N, etc work after
  builtin.live_grep({
    default_text = pat,
    attach_mappings = function(prompt_bufnr, _)
      -- modifying what happens on selection with <CR>
      actions.select_default:replace(function()
        local current_picker = action_state.get_current_picker(prompt_bufnr)
        local prompt = current_picker:_get_prompt()

        -- update the search register
        if prompt then
          vim.fn.setreg('/', prompt)
        end

        local entry = action_state.get_selected_entry()

        local filename = entry['filename']
        local lnum = entry['lnum']

        -- closing picker
        actions.close(prompt_bufnr)

        vim.cmd(':edit +' .. lnum .. ' ' .. filename)
        vim.api.nvim_input('n')
      end)
      -- keep default keybindings
      return true
    end,
  })
end

whichkey.add({
  { "<leader>", name = "chords", },

  {
    "<leader>#",
    function()
      require('Comment.api').toggle.linewise.current()
    end,
    desc = 'Commentary',
    mode = { "n" }
  },
  {
    "<leader>#",
    function()
      local api = require('Comment.api')
      api.toggle.linewise(vim.fn.visualmode())
    end,
    desc = 'Commentary',
    mode = { "v" }
  },
  {
    "<leader>a",
    '<cmd>:e #<cr>',
    desc = 'Edit alternate file'
  },
  {
    "<leader>q",
    vim.cmd.quit,
    desc = "quit"
  },
  {
    "<leader><leader>",
    function()
      vim.cmd.update()
      vim.fn.updatemsg()
    end,
    desc = "update"
  },

  { "$",        'g_',            desc = "eol" },
  { "^",        'g0',            desc = "g0" },
  {
    "0",
    function()
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
    end,
    desc = "bol/eol"
  },

  { "<c-d>", "<C-d>zz", desc = "down" },
  { "<c-b>", '<c-b>zz', desc = "backwards" },
  { "<c-e>", "5<c-e>",  desc = "5 up" },
  { "<c-f>", '<c-f>zz', desc = "forwards" },

  {
    "<c-p>",
    function()
      telescope.find_files({ hidden = false })
    end,
    desc = "find_files"
  },
  { "<c-u>",      "<c-u>zz", desc = "up" },
  { "<c-w><c-w>", "<C-W>p",  desc = "last window" },
  { "<c-y>",      "5<c-y>",  desc = "5 down" },

  { "g;",         'g;zvzz',  desc = 'go to older change' },
  { "g,",         'g,zvzz',  desc = "to to newer change" },

  {
    "gV",
    function() _G.VisualSelectLastChange() end,
    desc = "reselect last paste"
  },
  { 'gv',   [[<cmd>normal! gv<cr>]], desc = "reselect paste" },

  { "j",    'gj',                    desc = "gj" },
  { "J",    "mzJ`z",                 desc = "join lines but stay put" },
  { "k",    'gk',                    desc = "gk" },
  { "n",    "nzzzv",                 desc = "next match" },
  { "N",    "Nzzzv",                 desc = "prev match" },

  { "Y",    "y$",                    desc = "y$" },

  { "v",    "<c-v>",                 desc = "<c-v>" },
  { "U",    "<c-r>",                 desc = "<c-r>" },
  { "<cr>", "<Nop>",                 desc = "nop" },

  {
    "<leader>gh",
    function()
      vim.fn.cd(vim.fn.expand('%:h'))
    end,
    desc = "chdir('%:h')"
  },
  {
    "<leader>gH",
    function()
      vim.fn.cd(vim.fnlocal.CurGitRoot())
    end,
    desc = "chdir(<git root>)"
  },
  {
    "<leader>-",
    function()
      local gitroot = vim.fnlocal.CurGitRoot()
      vim.cmd(':Oil ' .. gitroot)
    end,
    desc = "launch vinegar in git root"
  },

})

whichkey.add({
  { "<leader>", name = "chords",  mode = { "v" } },
  { "z/",       'y/<C-R>"<CR>gv', mode = { "v" }, desc = 'put selected text in the search buffer' },
  { "<",        '<gv',            mode = { "v" }, desc = 'move visual block' },
  { ">",        '>gv',            mode = { "v" }, desc = 'move visual block' },
})

-- whichkey.add({
--   name = "chords",
--   {
--     '/',
--     function()
--       -- TODO there seems to be an issue with stale state and _G.GetVisualSelection
--       -- returns the previous selection, investigate this
--       -- for now we have to restart the visual selection manually
--       -- local pat = _G.GetVisualSelection()
--       vim.api.nvim_input('z/')
--       telescope.live_grep()
--     end,
--     desc = 'live_grep selected text'
--   },
--   { '<leader>tm', '<Plug>SendSelectionToTmux', desc = "SendSelectionToTmux" },
-- })

whichkey.add({
  { "<leader>p",   group = "pasties", mode = { "n" } },
  { "<leader>p",   [["_dP]],          mode = { "v" }, desc = "Paste last yank over visual selection" },
  { "<leader>pa'", [["_da'P]],        mode = { "n" }, desc = 'Paste last yank' },
  { "<leader>pi'", [["_di'P]],        mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pa"', '"_da"P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pi"', '"_di"P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pa{', '"_da{P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pi{', '"_di{P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pa}', '"_da}P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pi}', '"_di}P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pa(', '"_da(P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pi(', '"_di(P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pa)', '"_da]P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pi)', '"_di]P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pa[', '"_da[P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pi[', '"_di[P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pa]', '"_da]P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pi]', '"_di]P',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pal', '"_dalP',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pil', '"_dilP',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pap', '"_dapP',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>pip', '"_dipP',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>paW', '"_daWP',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>piW', '"_diWP',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>paw', '"_dawP',          mode = { "n" }, desc = 'Paste last yank' },
  { '<leader>piw', '"_diwP',          mode = { "n" }, desc = 'Paste last yank' },
})

-- whichkey.add({
--   { "", name = "cmdies", group = "cmdies", mode = { "c" } },
--   {
--     '%%',
--     "<C-R>=fnameescape(expand('%:h:p')).'/'<space><cr>",
--     desc = "expand dir of curfile"
--   },
--   {
--     'w!!',
--     [[%!SUDO_ASKPASS=$(which ssh-askpass) sudo -A tee % > /dev/null]],
--     desc = "write file out as root"
--   },
--   {
--     '!!',
--     function()
--     end,
--     desc = ''
--   }
-- })

-- cnoremap <expr> <c-n> wildmenumode() ? "\<c-n>" : "\<down>"
-- cnoremap <expr> <c-p> wildmenumode() ? "\<c-p>" : "\<up>"
map('i', '<c-w>', '<c-g>u<c-w>', { expr = false, desc = "" })
map('c', '<c-n>', '<down>', { expr = false })
map('c', '<c-p>', '<up>', { expr = false })

whichkey.add({
  { '',          group = "single-step",                         mode = { "n" } },

  { '<leader>"', telescope.buffers,                             desc = "Buffers" },

  { '<leader>$', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>%', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>&', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>(', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>)', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>*', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>.', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>:', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader><', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>>', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>`', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>~', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>¬', function() vim.cmd('echomsg("Unmapped")') end, desc = 'Run file' },
  { '<leader>^', '<cmd>:echomsg("TODO: Run file")<cr>',         desc = 'Run file' },
  { '<leader>£', '<cmd>:echomsg("TODO: Run file")<cr>',         desc = 'Run file' },

  {
    '<leader>a',
    ':edit #<cr>',
    desc = "edit alt",
  },
  {
    '<leader>lS',
    ':!less %<cr>',
    desc = "less %"
  },
  {
    '<leader>on',
    vim.cmd.only,
    desc = "only"
  },
  {
    '<leader>rl',
    ":source $MYVIMRC<cr>:lua vim.fn.OK(vim.fn.expand('$MYVIMRC') .. ' reloaded')<cr>",
    desc = "reload",
  },
  {
    '<leader>so',
    ":so<cr>:lua vim.fn.OK(vim.fn.expand('%') .. ' sourced')<cr>",
    desc = "source",
  },
  {
    '<leader>u',
    vim.cmd.UndotreeToggle,
    desc = "UndotreeToggle",
  },
  {
    '<leader>w',
    vim.cmd.update,
    desc = "update",
  },
})

whichkey.add({
  { '<leader>', group = "greps", name = "greps", mode = { "n" } },
  --
  {
    '<leader>/',
    function()
      local last_search = vim.fn.getreg('/')
      -- This is a hack to put the last search item into the telescope search
      -- This could have timing implications
      my_live_grep()
      vim.api.nvim_input(last_search)
    end,
    desc = "my_live_grep"
  },
  -- { '/',         "/<CR>/<C-e>",                                 desc = "resume search" },
  {
    '<leader>?',
    function()
      require("telescope.builtin").live_grep({ search_dirs = { vim.fn.expand("%:p") } })
    end,
    desc = "live_grep_current_buffer"
  },
  {
    '<leader>@',
    function()
      require('telescope.builtin').live_grep({ grep_open_files = true })
    end,
    desc = "live_grep_open_files"
  },
})

whichkey.add({

  { group = "inversions", mode = { "n" } },
  { "<leader>ip",         function() invert('paste') end, desc = 'invert paste' },
  { "<leader>is",         function() invert('spell') end, desc = 'invert spell' },
  {
    "<leader>ix",
    function()
      invert('cursorline'); invert('cursorcolumn')
    end,
    desc = 'invert cursorline/column'
  },

})

whichkey.add({
  { group = "cd", mode = { "n" } },
  {
    "<leader>ca",
    vim.lsp.buf.code_action,
    desc = "code action"
  },
  {
    "<leader>cd",
    function() vim.fn.cd(vim.fn.expand('%:h')) end,
    desc = 'lcd local'
  },
  {
    "<leader>cp",
    function() vim.fn.cd(vim.fn.resolve(vim.fn.expand('%:h') .. '/..')) end,
    desc = 'lcd parent'
  },
  {
    "<leader>cr",
    function() vim.fn.cd(vim.fnlocal.CurGitRoot()) end,
    desc = 'lcd root'
  },

  { "<leader>g",
    {
      "<leader>gr",
      function()
        vim.cmd(string.format([[:grep %s]], vim.fnlocal.CurWord()))
      end,
      desc = "grep selection"
    },
    {
      "<leader>go",
      function()
        local linenum, _ = unpack(vim.api.nvim_win_get_cursor(0))
        local basename = vim.api.nvim_buf_get_name(0)
        basename = string.gsub(basename, "(.*/)(.*)", "%2")
        local branch = vim.fnlocal.CurGitBranch()
        local filenum = string.format("%s:%s", basename, linenum)
        vim.fn.system({ "gh", "browse", "--branch", branch, filenum })
      end,
      desc = "gh browse"
    },
  },
})

whichkey.add({

  { "<leader>l", group = "listers", },
  {
    "<leader>ls",
    telescope.buffers,
    desc = "buffers"
  },
})

whichkey.add({

  { "<leader>m",  group = "messages",                                                                         mode = { "n" } },
  { "<leader>ma", [[:<c-u><c-r><c-r>='let @'. v:register .' = '. string(getreg(v:register))<cr><c-f><left>]], desc = "edit macro?" },
  { "<leader>ms", '<cmd>messages<cr>',                                                                        desc = ":messages" },
  { "<leader>mc", '<cmd>messages clear<cr>',                                                                  desc = ":messages clear" },

})

whichkey.add({
  -- t --
  { "<leader>t",  group = "telescope two-step", mode = { "n" } },
  {
    '<leader>t?',
    function()
      vim.cmd([[:Telescope]])
    end,
    desc = "live_grep_current_buffer"
  },
  { "<leader>tb", telescope.buffers,            desc = "buffers" },
  { "<leader>tc", telescope.commands,           desc = "commands" },
  { "<leader>th", telescope.help_tags,          desc = "help_tags" },
  { "<leader>tg", '<cmd>TagbarToggle<cr>',      desc = "TagbarToggle" },
  { "<leader>tj", telescope.jumplist,           desc = "jumplist" },
  {
    "<leader>tk",
    function()
      vim.cmd([[
        :GkeepLogin
        :lua require('telescope').load_extension('gkeep')
        :Telescope gkeep
      ]])
    end,
    desc = "gkeep"
  },
  { "<leader>tm", telescope.marks,     desc = "marks" },
  -- s = { ':lua <Plug>NormalModeSendToTmux', "SendSelectionToTmux" },
  { "<leader>tq", telescope.quickfix,  desc = "quickfix" },
  { "<leader>tr", telescope.registers, desc = "registers" },
  { "<leader>tt", telescope.resume,    desc = "resume" },
  { "<leader>tv", '<Plug>SetTmuxVars', desc = "SetTmuxVars" },

  -- w --
  { "<leader>w",  group = 'worktree',  mode = { "n" } },
  {
    "<leader>wr",
    vim.cmd.update,
    desc = "update"
  },
  {
    "<leader>ww",
    function()
      telescope.load_extension("git_worktree")
      telescope.extensions.git_worktree.git_worktrees()
    end,
    desc = 'select worktrees'
  },

  -- z --
  {
    "<leader>z",
    name = "zebra",
  },
  {
    "<leader>nz",
    function()
      print('zebra from tanzania')
    end,
    desc = "zebra from tanzania"
  }

})

-- local M = {}

-- function M.map(mode, lhs, rhs, opts)
--     local options = { noremap = true }
--     if opts then
--         options = vim.tbl_extend("force", options, opts)
--     end
--     vim.api.nvim_set_keymap(mode, lhs, rhs, options)
-- end

-- return M

map("n", "S", [[:%s/\<<C-r>/\>/<C-r><C-w>/gI<Left><Left><Left>]])
map("n", "<leader>;", ":")
map("n", "<leader>!", ":!<C-P>")
map("n", "<leader>:", ":<C-P>")
-- map('n', '*', '*zz', {desc = 'Search and center screen'})

map("v", "J", ":m '>+1<CR>gv=gv")
map("v", "K", ":m '<-2<CR>gv=gv")

-- map("x", "<leader>p", [["_dP]], {desc = 'Paste last yank over visual selection'}) -- greatest remap ever

-- map('v', '<leader>/', ':<c-u>lua vim.b.visual_selection=vim.fnlocal.GetVisualSelection()<cr>' ..
--   ':grep <c-r>=fnameescape(expand(b:visual_selection))<c-j>',
--   { desc = 'Search for term selected' })
map('i', '<Tab>', function()
  return vim.fn.pumvisible() == 1 and '<C-N>' or '<Tab>'
end, { expr = true })

-- Disable mouse/scollpad-induced keymaps
vim.keymap.set("", "<up>", "<nop>", { noremap = true })
vim.keymap.set("", "<down>", "<nop>", { noremap = true })
vim.keymap.set("i", "<up>", "<nop>", { noremap = true })
vim.keymap.set("i", "<down>", "<nop>", { noremap = true })

-- vim:nowrap

-- References
-- https://github.com/ThePrimeagen/init.lua/blob/master/after/plugin/lsp.lua
