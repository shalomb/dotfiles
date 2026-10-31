-- Self-authored core navigation and text-editing keymaps (zero third-party plugins).
-- Loaded in both normal mode and `pass edit` cleanroom mode.

local M = {}

local function smart_bol_eol()
  local col = vim.fn.col(".")
  local line = vim.fn.getline(".")
  local lead = string.sub(line, 0, col - 1)
  local match = string.find(lead, "[^%s]")
  if not match then
    local beg = string.find(line, "[^%s]")
    if beg and beg ~= col then
      vim.fn.cursor(".", beg)
    else
      vim.fn.feedkeys("g_")
    end
  else
    vim.fn.feedkeys("g^")
  end
end

function M.setup()
  local map = vim.keymap.set

  -- Display-line vertical movement and centered scrolling
  map("n", "j", "gj", { desc = "gj" })
  map("n", "k", "gk", { desc = "gk" })
  map("n", "$", "g_", { desc = "eol" })
  map("n", "^", "g0", { desc = "g0" })
  map("n", "0", smart_bol_eol, { desc = "bol/eol" })
  map("n", "<C-d>", "<C-d>zz", { desc = "down" })
  map("n", "<C-u>", "<C-u>zz", { desc = "up" })
  map("n", "<C-f>", "<C-f>zz", { desc = "forwards" })
  map("n", "<C-b>", "<C-b>zz", { desc = "backwards" })
  map("n", "<C-e>", "5<C-e>", { desc = "5 up" })
  map("n", "<C-y>", "5<C-y>", { desc = "5 down" })
  map("n", "n", "nzzzv", { desc = "next match" })
  map("n", "N", "Nzzzv", { desc = "prev match" })
  map("n", "g;", "g;zvzz", { desc = "go to older change" })
  map("n", "g,", "g,zvzz", { desc = "go to newer change" })

  -- Text editing & line manipulation
  map("n", "J", "mzJ`z", { desc = "join lines but stay put" })
  map("n", "Y", "y$", { desc = "y$" })
  map("n", "U", "<C-r>", { desc = "redo" })
  map("n", "v", "<C-v>", { desc = "visual block" })
  map("n", "<C-w><C-w>", "<C-w>p", { desc = "last window" })
  map("n", "S", [[:%s/\<<C-r>/\>/<C-r><C-w>/gI<Left><Left><Left>]], { desc = "substitute word" })
  map("n", "<leader>;", ":", { desc = "cmdline" })
  map("n", "<leader>!", ":!<C-p>", { desc = "prev shell cmd" })
  map("n", "<leader>:", ":<C-p>", { desc = "prev ex cmd" })
  map("n", "<leader>q", vim.cmd.quit, { desc = "quit" })
  map("n", "<leader>a", "<cmd>e #<cr>", { desc = "Edit alternate file" })

  -- Visual mode indentation & line transposition
  map("v", "<", "<gv", { desc = "indent left and reselect" })
  map("v", ">", ">gv", { desc = "indent right and reselect" })
  map("v", "J", ":m '>+1<CR>gv=gv", { desc = "move selection down" })
  map("v", "K", ":m '<-2<CR>gv=gv", { desc = "move selection up" })
  map("v", "z/", 'y/<C-R>"<CR>gv', { desc = "search visual selection" })

  -- Insert & Command-line ergonomics
  map("i", "<C-w>", "<C-g>u<C-w>", { expr = false, desc = "undoable word delete" })
  map("c", "<C-n>", "<Down>", { expr = false })
  map("c", "<C-p>", "<Up>", { expr = false })
  map("i", "<Tab>", function()
    return vim.fn.pumvisible() == 1 and "<C-N>" or "<Tab>"
  end, { expr = true })

  -- Disable arrow keys
  map("", "<up>", "<nop>", { noremap = true })
  map("", "<down>", "<nop>", { noremap = true })
  map("i", "<up>", "<nop>", { noremap = true })
  map("i", "<down>", "<nop>", { noremap = true })

  -- Seamless Ctrl-h/j/k/l split navigation without requiring vim-tmux-navigator plugin
  map("n", "<C-h>", "<C-w>h", { desc = "window left" })
  map("n", "<C-j>", "<C-w>j", { desc = "window down" })
  map("n", "<C-k>", "<C-w>k", { desc = "window up" })
  map("n", "<C-l>", "<C-w>l", { desc = "window right" })
end

return M
