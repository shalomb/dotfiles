-- config for stevearc/oil.nvim


local oil = require('oil')

require("oil").setup({
  default_file_explorer = true,
  columns = {
    "icon",
    "size",
    -- "mtime",
    -- "permissions",
  },
  keymaps = {
    ["g?"] = "actions.show_help",
    ["<CR>"] = "actions.select",
    ["<C-v>"] = "actions.select_vsplit",
    ["<C-x>"] = "actions.select_split",
    ["<C-t>"] = "actions.select_tab",
    ["<C-p>"] = "actions.preview",
    ["<C-c>"] = "actions.close",
    ["<C-l>"] = "actions.refresh",
    ["-"] = "actions.parent",
    ["_"] = "actions.open_cwd",
    ["`"] = "actions.cd",
    ["~"] = "actions.tcd",
    ["gs"] = "actions.change_sort",
    ["gx"] = "actions.open_external",
    ["g."] = "actions.toggle_hidden",
    ["g\\"] = "actions.toggle_trash",
    ["y."] = "actions.copy_entry_path", -- a la vinegar.vim
    ["."] = "actions.open_cmdline",     -- a la vinegar.vim
  },
  use_default_keymaps = true,
})

local function relative_path(path, ref)
  return path:gsub(ref .. "/", "", 1)
end

local function cmd_with_path(cmd, path)
  local escaped =
      vim.api.nvim_replace_termcodes(cmd .. " " .. vim.fn.fnameescape(path), true, false, true)
  vim.api.nvim_feedkeys(escaped, "n", false)
end


vim.keymap.set("n", "-", "<CMD>Oil<CR>", { remap = true, desc = "Open parent directory" })

-- https://github.com/stevearc/oil.nvim/blob/master/doc/oil.txt#L347
vim.api.nvim_create_autocmd("FileType", {
  pattern = "oil",
  -- group = group,
  callback = function()
    vim.keymap.set("n", "~", "<CMD>Oil ~<CR>",
      { buffer = true, remap = true, desc = "Open home directory" })

    vim.keymap.set("n", "%", function()
        cmd_with_path(":vsp", relative_path(oil.get_current_dir(), vim.fn.getcwd()))
      end,
      { buffer = true, remap = true, desc = "Close oil and restore buffer" })

    vim.keymap.set("n", "<space>q", function()
      require("oil.actions").close.callback()
    end, { buffer = true, remap = true, desc = "Close oil and restore buffer" })

    vim.keymap.set("n", "gr", function()
      vim.cmd(":Oil " .. vim.fnlocal.CurGitRoot())
    end, { buffer = true, remap = true, desc = "Open git root" })

    vim.keymap.set("n", "gh", function()
      vim.fn.chdir(vim.fnlocal.CurGitRoot())
      vim.cmd(":Oil ~")
    end, { buffer = true, remap = true, desc = "Open home directory" })
  end,
})
