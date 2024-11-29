-- commands
-- See User Commands in https://vonheikemen.github.io/devlog/tools/configuring-neovim-using-lua/

local tf_cmd_tab = {
  { "Tfm", "main.tf" },
  { "Tfv", "variables.tf" },
  { "Tfo", "outputs.tf" },
}

for k, v in pairs(tf_cmd_tab) do
  vim.api.nvim_create_user_command(
    v[1],
    function(input)
      local root = '~/workspace'
      local term = string.len(input['args']) > 0 and input['args'] or ''
      local glob = string.format("%s/*%s*", root, term)
      local selected = vim.split(
        vim.fn.glob(glob),
        '\n',
        { trimempty = true }
      )

      require("telescope.builtin").find_files({
        cwd = "~/workspace/",
        search_dirs = selected,
        find_command = { "fd", "--color", "never", "-d", "4" },
        default_text = v[2]
      })
    end,
    { bang = true, nargs = '+', desc = 'Search building blocks' }
  )
end
