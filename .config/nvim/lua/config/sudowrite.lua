-- lua

-- sudowrite - Allow writeout of files not owned by current user
-- https://github.com/seankhliao/config/blob/main/nvim/init.lua#LL344C1-L356C42

local sudowrite = function()
  local tmpfilename = os.tmpname()
  local tmpfile = io.open(tmpfilename, "w") or error("Error creating tmpfile")
  for _, line in ipairs(vim.api.nvim_buf_get_lines(0, 0, -1, false)) do
    tmpfile:write(line .. "\n")
  end
  tmpfile:close()
  local curfilename = vim.api.nvim_buf_get_name(0)
  os.execute(string.format("sudo tee %s < %s > /dev/null", curfilename, tmpfilename))
  vim.cmd([[ edit! ]])
  os.remove(tmpfilename)
end

vim.api.nvim_create_user_command('WRITE', sudowrite, { nargs = '?' })
