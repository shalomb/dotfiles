-- lua

local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

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
        print('\n')
        vim.fn.OK(curfile .. ' sourced')
      end
    end,
  })

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
})

autocmd(
  { 'VimEnter' }, {
    group = 'restore_last_position',
    pattern = { '*' },
    callback = function()
      if vim.o.filetype == "" and next(vim.fn.argv()) == nil then
        vim.fn.feedkeys('')
      end
    end
  })

-- disable relativenumber in inactive buffers
augroup('inactive_buffer_settings', { clear = true })
autocmd(
  { 'BufEnter', 'InsertLeave', 'CmdWinLeave', 'CmdlineLeave' }, {
    group   = 'inactive_buffer_settings',
    pattern = '*',
    command = 'set nu rnu cursorline'
  })

autocmd(
  { 'BufLeave', 'InsertEnter', 'CmdWinEnter', 'CmdlineEnter' }, {
    group   = 'inactive_buffer_settings',
    pattern = '*',
    command = 'set nu nornu nocursorline'
  })

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
  })

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
  })

-- auto format on save
augroup('autoformat_on_save', { clear = true })

local is_exempt_from_formatting = function(ft, client)
  local excluded_filetypes = { 'sh', 'md', 'markdown', 'text' }
  for _, v in ipairs(excluded_filetypes) do
    if string.find(ft, v) then
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

vim.api.nvim_create_autocmd('LspAttach', {
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    if client == nil then
      return {}
    end
    --if client.supports_method('textDocument/implementation') then
    --  -- Create a keymap for vim.lsp.buf.implementation
    --end
    --if client.supports_method('textDocument/completion') then
    --  -- Enable auto-completion
    --  vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
    --end
    if client.supports_method('textDocument/formatting') then
      -- Format the current buffer on save
      vim.api.nvim_create_autocmd('BufWritePre', {
        buffer = args.buf,
        callback = function()
          vim.lsp.buf.format({
            bufnr = args.buf,
            id = client.id,
            async = false
          })
          -- print(
          --   "autoformat_on_save : " ..
          --   args.buf .. " -> " .. vim.inspect(client.supports_method('textDocument/formatting'))
          -- )
        end,
      })
    end
  end
})

---- https://neovim.io/doc/user/lsp.html#lsp-config
--autocmd(
--  { 'LspAttach' }, {
--    callback = function(args)
--      local client = vim.lsp.get_client_by_id(args.data.client_id)
--      local buffer = args.buf
--      --if client.supports_method('textDocument/completion') then
--      --  -- Enable auto-completion
--      --  vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
--      --end
--      if client.supports_method('textDocument/formatting') then
--        autocmd('BufWritePre', {
--        buffer   = buffer,
--          callback = function()
--            vim.lsp.buf.format({
--              id     = client.id,
--              async  = false,
--              -- id = args.id,
--              filter = function()
--                print(
--                  "autoformat_on_save : " ..
--                  args.buf .. " -> " .. vim.inspect(client.supports_method('textDocument/formatting'))
--                )
--                return not is_exempt_from_formatting(vim.bo.filetype, client)
--              end
--            })
--          end
--        })
--      end
--    end
--  })

-- rebalance size of windows on vim window resize
augroup('window_resize', { clear = true })
autocmd(
  { 'VimResized' }, {
    group = 'window_resize',
    callback = function()
      vim.cmd([[:wincmd =]])
    end
  })

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
  })

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
  })

-- quickfix
augroup('quickfix_settings', { clear = true })
autocmd(
  { 'BufReadPost' }, {
    group = 'quickfix_settings',
    pattern = { 'quickfix' },
    callback = function()
      vim.keymap.set("n", "<cr>", "<cr>", { noremap = true })
    end
  })

-- cmdwin
augroup('cmdwin_settings', { clear = true })
autocmd(
  { 'CmdWinEnter' }, {
    group = 'cmdwin_settings',
    pattern = { '*' },
    callback = function()
      vim.keymap.set("n", "<cr>", "<cr>", { noremap = true })
    end
  })

-- gitcommit
augroup('gitcommit_settings', { clear = true })
autocmd(
  { 'FileType' }, {
    group = 'gitcommit_settings',
    pattern = { 'gitcommit' },
    command = '1 | setlocal spell tw=72 colorcolumn+=51 colorcolumn+=73'
  })
