-- commands
-- See User Commands in https://vonheikemen.github.io/devlog/tools/configuring-neovim-using-lua/

vim.api.nvim_create_user_command(
  'ProjectFiles',
  function(input)
    vim.call('fzf#vim#files', '~/projects', input.bang)
  end,
  {bang = true, desc = 'Search projects folder'}
)
