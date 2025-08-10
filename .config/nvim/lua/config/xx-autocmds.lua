-- lua

local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

-- autoupdate
augroup("autoupdate", { clear = true })
autocmd(
  {
    "BufLeave", "BufWinLeave", "CmdlineLeave", "FocusLost",
    "InsertLeave", "TabLeave", "Textchanged", "VimLeavePre", "WinLeave"
  }, {
    group = 'autoupdate',
    pattern = { '*' },
    callback = function()
      local buf = vim.api.nvim_win_get_buf(0)
      if not vim.api.nvim_buf_get_option(buf, 'readonly') and
          vim.api.nvim_buf_get_option(buf, 'modified') and
          vim.api.nvim_buf_get_option(buf, 'buftype') == "" and
          vim.fn.expand("%") ~= ""
      then
        vim.cmd([[silent update]])
        vim.fn.updatemsg()
      end
    end,
  }
)

-- set formatprg on load and when textwidth is changed
vim.fn.update_format_prg = function()
  local buf = vim.api.nvim_win_get_buf(0)
  local textwidth = vim.bo.textwidth or 79
  if vim.api.nvim_buf_get_option(buf, 'buftype') == "" then
    vim.bo.formatprg = string.gsub(vim.bo.formatprg or vim.o.formatprg, '%d+', textwidth)
  end
end

augroup("formatprg_set", { clear = true })
autocmd(
  { "VimEnter", "BufEnter" }, {
    group = 'formatprg_set',
    pattern = { '*' },
    callback = function()
      vim.fn.update_format_prg()
    end,
  }
)
autocmd(
  { "OptionSet" }, {
    group = 'formatprg_set',
    pattern = { 'textwidth' },
    callback = function()
      vim.fn.update_format_prg()
    end,
  }
)

-- autoload config files as soon as they are written to
augroup("config_reload", { clear = true })
autocmd(
  { "BufWritePost", "FileWritePost" }, {
    group = 'config_reload',
    pattern = { '*/lua/config/*.lua', '*/lua/config/*.vim', vim.env.MYVIMRC },
    callback = function()
      local curfile = vim.fn.expand('%:p')
      if not (string.match(curfile, '^fugitive:')) then
        vim.cmd(string.format(':source %s', curfile))
      end
    end,
  }
)

augroup("auto_open_qf", { clear = true })
autocmd(
  { "QuickFixCmdPost", }, {
    group = "auto_open_qf",
    pattern = { "[^l]*" },
    command = "cwindow"
  }
)
autocmd(
  { "QuickFixCmdPost", }, {
    group = "auto_open_qf",
    pattern = { "l*" },
    command = "lwindow"
  }
)
autocmd(
  { "BufReadPost", }, {
    group = "auto_open_qf",
    pattern = "qf",

    callback = function()
      vim.cmd([[setlocal nobuflisted]])
      vim.cmd([[wincmd J]])
    end,
  }
)



-- set the filetype if not already set
-- i.e. with extention-less files, the filetype is only known after the shebang is written
-- This allows us to write the shebang and write out for automatic filetype setting
-- https://www.reddit.com/r/neovim/comments/1girx8g/comment/lvbbuqm/
augroup("filetype_detect", { clear = true })
autocmd(
  { "BufWritePost", "FileWritePost" }, {
    group = 'filetype_detect',
    pattern = { '*' },
    callback = function()
      if vim.bo.filetype == "" then
        vim.cmd("filetype detect")
      end
    end,
  }
)

-- restore position
augroup('restore_last_position', { clear = true })
autocmd('BufReadPost', {
  group    = 'restore_last_position',
  pattern  = '*',
  callback = function()
    local ft = vim.opt_local.filetype:get()
    if vim.fn.line("'\"") > 0 and
        vim.fn.line("'\"") <= vim.fn.line("$") and
        not (string.match(ft, "commit")) and
        not (string.match(ft, "^fugitive"))
    then
      vim.fn.setpos('.', vim.fn.getpos("'\""))
    end
  end
}
)

autocmd(
  { 'VimEnter' }, {
    group = 'restore_last_position',
    pattern = { '*' },
    callback = function()
      if vim.o.filetype == "" and next(vim.fn.argv()) == nil then
        vim.fn.feedkeys('')
      end
    end
  }
)

-- disable relativenumber in inactive buffers
augroup('inactive_buffer_settings', { clear = true })
autocmd(
  { 'BufEnter', 'InsertLeave', 'CmdWinLeave', 'CmdlineLeave', 'ExitPre' }, {
    group   = 'inactive_buffer_settings',
    pattern = '*',
    command = 'set nu rnu cursorline'
  }
)

autocmd(
  { 'BufLeave', 'InsertEnter', 'CmdWinEnter', 'CmdlineEnter' }, {
    group   = 'inactive_buffer_settings',
    pattern = '*',
    command = 'set nu nornu nocursorline'
  }
)

-- strip extraneous whitespace
augroup('extraneous_whitespace', { clear = true })
vim.api.nvim_set_hl(0, 'ExtraneousWhitepsace', { bg = 'red', underline = false })
augroup('extraneous_whitespace', { clear = true })

autocmd(
  { 'BufEnter', 'InsertLeave' }, {
    group = 'extraneous_whitespace',
    callback = function()
      vim.fn.matchadd('extraneous_whitespace', '/\\v(\\S\zs\\s+$| +\\zs\\t|\\t\\ze +)/')
    end
  }
)

autocmd(
  { 'InsertEnter' }, {
    group = 'extraneous_whitespace',
    callback = function()
      vim.fn.matchadd('extraneous_whitespace', '/\\v\\s+\\%#\\@<!$/')
    end
  })

autocmd(
  { 'BufCreate', 'BufWritePre' }, {
    group = 'extraneous_whitespace',
    callback = function()
      vim.cmd([[:silent! %s/\v\s+$//ge]])
    end
  }
)

-- auto format on save
augroup('autoformat_on_save', { clear = true })

vim.fnlocal.is_exempt_from_formatting = function(ft, client)
  local excluded_filetypes = {
    'sh', 'md', 'markdown', 'text',
    -- 'yaml' -- yamlfmt is aggressive about extraneous newlines, start of doc separators, etc
  }
  for _, v in ipairs(excluded_filetypes) do
    if string.find(ft, v) then
      -- TODO: Make this a buffer local option
      vim.b.is_exempt_from_formatting = true
      return true
    end
  end

  local excluded_clients = { 'bashls', 'tsserver' }
  for _, v in ipairs(excluded_clients) do
    if string.find(client.name, v) then
      return true
    end
  end
  return false
end

--if client.supports_method('textDocument/implementation') then
--  -- Create a keymap for vim.lsp.buf.implementation
--end

--if client.supports_method('textDocument/completion') then
--  -- Enable auto-completion
--  vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
--end

local lsp_fmt_augroup = vim.api.nvim_create_augroup("LspFormatting", { clear = false })
-- TODO autocmd('BufReadPost', {
vim.api.nvim_create_autocmd('LspAttach', {
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    if client == nil then
      return {}
    end

    ---- https://neovim.io/doc/user/lsp.html#lsp-config
    local is_exempt = vim.fnlocal.is_exempt_from_formatting(vim.bo.filetype, client)

    if client:supports_method('textDocument/formatting') then
      vim.api.nvim_create_autocmd('BufWritePre', {
        -- https://github.com/neovim/neovim/issues/21098#issuecomment-1320001372is_exempt_from_formatting
        vim.api.nvim_clear_autocmds({
          group = lsp_fmt_augroup,
          -- TODO augroup('restore_last_position', { clear = true })
          buffer = args.buf
        }),
        group = lsp_fmt_augroup,
        buffer = args.buf,
        callback = function()
          if not is_exempt then
            vim.lsp.buf.format({
              bufnr = args.buf,
              id = client.id,
              async = false
            })
          end
        end,
      })
    end
  end
}
)

-- rebalance size of windows on vim window resize
augroup('window_resize', { clear = true })
autocmd(
  { 'VimResized' }, {
    group = 'window_resize',
    callback = function()
      vim.cmd([[:wincmd =]])
    end
  }
)

-- set go preferences
augroup('go_settings', { clear = true })
autocmd(
  { 'BufNewFile', 'BufRead' }, {
    group = 'go_settings',
    pattern = { '*.go' },
    callback = function()
      vim.cmd([[
      set et ts=4 sts=4 sw=4 tw=99 ai cin ff=unix enc=utf-8 fenc=utf-8
    ]])
    end
  }
)

-- set lua preferences
augroup('lua_settings', { clear = true })
autocmd(
  { 'BufNewFile', 'BufRead' }, {
    group = 'lua_settings',
    pattern = { '*.py' },
    callback = function()
      vim.cmd([[
      set et ts=2 sts=2 sw=2 tw=78 ai cin ff=unix enc=utf-8 fenc=utf-8
    ]])
    end
  }
)

-- set python preferences
augroup('python_settings', { clear = true })
autocmd(
  { 'BufNewFile', 'BufRead' }, {
    group = 'python_settings',
    pattern = { '*.py' },
    callback = function()
      vim.cmd([[
      set et ts=4 sts=4 sw=4 tw=78 ai cin ff=unix enc=utf-8 fenc=utf-8
    ]])
    end
  }
)

-- set terraform preferences
augroup('terraform_settings', { clear = true })
autocmd(
  { 'BufNewFile', 'BufRead' }, {
    group = 'terraform_settings',
    pattern = { '*.tf' },
    callback = function()
      vim.cmd([[
      set et ts=4 sts=4 sw=4 tw=78 ai cin ff=unix enc=utf-8 fenc=utf-8 ft=terraform
    ]])
    end
  }
)

-- quickfix
augroup('quickfix_settings', { clear = true })
autocmd(
  { 'BufReadPost' }, {
    group = 'quickfix_settings',
    pattern = { 'quickfix' },
    callback = function()
      vim.keymap.set("n", "<cr>", "<cr>", { noremap = true })
    end
  }
)

-- cmdwin
augroup('cmdwin_settings', { clear = true })
autocmd(
  { 'CmdWinEnter' }, {
    group = 'cmdwin_settings',
    pattern = { '*' },
    callback = function()
      vim.keymap.set("n", "<cr>", "<cr>", { noremap = true })
    end
  }
)

-- gitcommit
augroup('gitcommit_settings', { clear = true })
autocmd(
  { 'FileType' }, {
    group = 'gitcommit_settings',
    pattern = { 'gitcommit' },
    command = '1 | setlocal spell tw=72 colorcolumn+=51 colorcolumn+=73'
  }
)
