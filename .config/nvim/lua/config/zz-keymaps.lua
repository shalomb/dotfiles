-- local api = require('Comment.api')

local vim = vim

local map = vim.keymap.set
local whichkey = require("which-key")
local telescope = require("telescope.builtin")

-- Autocmd: Reload keymaps file on write
vim.api.nvim_create_autocmd("BufWritePost", {
    pattern = "zz-keymaps.lua",
    callback = function()
        vim.cmd("source " .. vim.fn.expand("%"))
    end,
    group = vim.api.nvim_create_augroup("keymaps_reload", { clear = true }),
})

-- Helper: Clear command area after echo
local function clear_cmdarea()
    vim.defer_fn(function()
        vim.api.nvim_echo({}, false, {})
    end, 5000)
end

-- Helper: Custom updatemsg
vim.fn.updatemsg = function(msg)
    local time = os.date "%T"
    if not msg or msg == "" then
        msg = string.format(' %s: %s %s', time, vim.fn.expand('%:f'), vim.loop.cwd())
    end
    vim.api.nvim_echo({ { "󰄳 ", "LazyProgressDone" }, { msg } }, false, {})
    clear_cmdarea()
end

-- Helper: Invert option
local function invert(opt)
    vim.opt_local[opt] = not vim.opt_local[opt]:get()
    vim.fn.OK((vim.opt_local[opt]:get() and '' or 'no') .. opt)
end

-- Helper: Change directory
vim.fn.cd = function(dir)
    if vim.fn.isdirectory(dir) == 1 then
        vim.fn.chdir(dir)
        vim.fn.OK(string.format('cd %s', vim.fn.resolve(dir)))
    else
        vim.fn.NOK(string.format('Not a directory %s', dir))
    end
end

-- Helper: Live grep with search register update
local function my_live_grep(pat)
    local actions = require "telescope.actions"
    local builtin = require("telescope.builtin")
    local action_state = require('telescope.actions.state')

    builtin.live_grep({
        default_text = pat,
        attach_mappings = function(prompt_bufnr, _)
            actions.select_default:replace(function()
                local current_picker = action_state.get_current_picker(prompt_bufnr)
                local prompt = current_picker:_get_prompt()
                if prompt then vim.fn.setreg('/', prompt) end
                local entry = action_state.get_selected_entry()
                local filename, lnum = entry.filename, entry.lnum
                actions.close(prompt_bufnr)
                vim.cmd(':edit +' .. lnum .. ' ' .. filename)
                vim.api.nvim_input('n')
            end)
            return true
        end,
    })
end

-- Keymaps via which-key
whichkey.add({
    { "<leader>",  name = "chords" },
    { "<leader>#", function() require('Comment.api').toggle.linewise.current() end,            desc = 'Commentary',         mode = "n" },
    { "<leader>#", function() require('Comment.api').toggle.linewise(vim.fn.visualmode()) end, desc = 'Commentary',         mode = "v" },
    { "<leader>a", '<cmd>:e #<cr>',                                                            desc = 'Edit alternate file' },
    { "<leader>q", vim.cmd.quit,                                                               desc = "quit" },
    {
        "<leader><leader>",
        function()
            local bufnr = vim.api.nvim_buf_get_number(0)
            local current_tick = vim.api.nvim_buf_get_changedtick(bufnr)
            local last_format_tick = vim.b.format_tick or 0
            print(string.format('cur:%s last:%s', current_tick, last_format_tick))
            if current_tick > last_format_tick then
                vim.cmd.write()
                vim.cmd.diffupdate()
                vim.cmd.redraw()
                vim.b.format_tick = current_tick
            else
                vim.cmd.update()
            end
            vim.fn.updatemsg()
        end,
        desc = "update buffer"
    },
    { "$", 'g_', desc = "eol" },
    { "^", 'g0', desc = "g0" },
    {
        "0",
        function()
            local col = vim.fn.col('.')
            local line = vim.fn.getline('.')
            local lead = string.sub(line, 0, col - 1)
            local match = string.find(lead, '[^%s]')
            if not match then
                local beg = string.find(line, '[^%s]')
                if beg and beg ~= col then
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
    { "<c-d>",      "<C-d>zz",                                               desc = "down" },
    { "<c-b>",      '<c-b>zz',                                               desc = "backwards" },
    { "<c-e>",      "5<c-e>",                                                desc = "5 up" },
    { "<c-f>",      '<c-f>zz',                                               desc = "forwards" },
    { "<c-p>",      function() telescope.find_files({ hidden = false }) end, desc = "find_files" },
    { "<c-u>",      "<c-u>zz",                                               desc = "up" },
    { "<c-w><c-w>", "<C-W>p",                                                desc = "last window" },
    { "<c-y>",      "5<c-y>",                                                desc = "5 down" },
    { "g;",         'g;zvzz',                                                desc = 'go to older change' },
    { "g,",         'g,zvzz',                                                desc = "to to newer change" },
    { "gV",         function() _G.VisualSelectLastChange() end,              desc = "reselect last paste" },
    { 'gv',         [[<cmd>normal! gv<cr>]],                                 desc = "reselect paste" },
    { "j",          'gj',                                                    desc = "gj" },
    { "J",          "mzJ`z",                                                 desc = "join lines but stay put" },
    { "k",          'gk',                                                    desc = "gk" },
    { "n",          "nzzzv",                                                 desc = "next match" },
    { "N",          "Nzzzv",                                                 desc = "prev match" },
    { "Y",          "y$",                                                    desc = "y$" },
    { "v",          "<c-v>",                                                 desc = "<c-v>" },
    { "U",          "<c-r>",                                                 desc = "<c-r>" },
    { "<cr>",       "<Nop>",                                                 desc = "nop" },
    { "<leader>gh", function() vim.fn.cd(vim.fn.expand('%:h')) end,          desc = "chdir('%:h')" },
    { "<leader>gH", function() vim.fn.cd(vim.fnlocal.CurGitRoot()) end,      desc = "chdir(<git root>)" },
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
    { "<leader>", name = "chords",  mode = "v" },
    { "z/",       'y/<C-R>"<CR>gv', mode = "v", desc = 'put selected text in the search buffer' },
    { "<",        '<gv',            mode = "v", desc = 'move visual block' },
    { ">",        '>gv',            mode = "v", desc = 'move visual block' },
})

whichkey.add({
    { "<leader>p", group = "pasties", mode = "n" },
    { "<leader>p", [["_dP]],          mode = "v", desc = "Paste last yank over visual selection" },
    -- ... (paste/yank keymaps omitted for brevity, keep as in original)
})

map('i', '<c-w>', '<c-g>u<c-w>', { expr = false, desc = "" })
map('c', '<c-n>', '<down>', { expr = false })
map('c', '<c-p>', '<up>', { expr = false })

whichkey.add({
    { '',          group = "single-step", mode = "n" },
    { '<leader>"', telescope.buffers,     desc = "Buffers" },
    -- ... (other single-step keymaps)
})

whichkey.add({
    { '<leader>', group = "greps", name = "greps", mode = "n" },
    {
        '<leader>/',
        function()
            local last_search = vim.fn.getreg('/')
            my_live_grep()
            vim.api.nvim_input(last_search)
        end,
        desc = "my_live_grep"
    },
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
    { group = "inversions", mode = "n" },
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
    { group = "cd", mode = "n" },
    { "<leader>ca", vim.lsp.buf.code_action,                                                 desc = "code action" },
    { "<leader>cd", function() vim.fn.cd(vim.fn.expand('%:h')) end,                          desc = 'lcd local' },
    { "<leader>cp", function() vim.fn.cd(vim.fn.resolve(vim.fn.expand('%:h') .. '/..')) end, desc = 'lcd parent' },
    { "<leader>cr", function() vim.fn.cd(vim.fnlocal.CurGitRoot()) end,                      desc = 'lcd root' },
    { "<leader>g", {
        { "<leader>gg", function() vim.cmd([[:G]]) end, desc = "fugitive" },
        -- ... (other git keymaps)
    }
    },
})

-- Additional which-key groups (listers, messages, telescope, worktree, zebra, etc.)
-- ... (copy as needed from original, grouping logically)

-- Direct keymaps
map("n", "S", [[:%s/\<<C-r>/\>/<C-r><C-w>/gI<Left><Left><Left>]])
map("n", "<leader>;", ":")
map("n", "<leader>!", ":!<C-P>")
map("n", "<leader>:", ":<C-P>")
map("v", "J", ":m '>+1<CR>gv=gv")
map("v", "K", ":m '<-2<CR>gv=gv")
map('i', '<Tab>', function()
    return vim.fn.pumvisible() == 1 and '<C-N>' or '<Tab>'
end, { expr = true })

-- Disable mouse/scrollpad-induced keymaps
map("", "<up>", "<nop>", { noremap = true })
map("", "<down>", "<nop>", { noremap = true })
map("i", "<up>", "<nop>", { noremap = true })
map("i", "<down>", "<nop>", { noremap = true })

-- vim:nowrap

-- References
-- https://github.com/ThePrimeagen/init.lua/blob/master/after/plugin/lsp.lua
