-- lua

local vim = vim

local thisdir = (...):match("(.-)[^%.]+$")
local path = require(thisdir .. 'pathtools')

vim.g.gkeep_sync_dir = path.join(vim.env.XDG_CACHE_HOME, 'gkeep')
if not(path.exists(vim.g.gkeep_sync_dir)) then
  print('mkdir: ' .. path.exists(vim.g.gkeep_sync_dir))
  path.mkdir(path.exists(vim.g.gkeep_sync_dir))
end
-- vim.cmd('mkdir -p ' .. vim.g.gkeep_sync_dir)
-- vim.g.gkeep_sync_archived = true

require("telescope").setup({
  -- You can optionally configure the search method for each of the pickers.
  -- Below are the default values.
  extensions = {
    gkeep = {
      find_method = "all_text",
      link_method = "title",
    },
  },
})

-- Load the extension
-- require('telescope').load_extension('gkeep')

-- installation
-- pip3 install gkeepapi keyring keyrings.alt
-- python3 -m keyring set system username
-- python3 -m keyring get system username
-- checkhealth gkeep
-- generate app password at https://myaccount.google.com/apppasswords
-- GkeepLogin s.bhooshi@gmail.com
--  - will prompt for the keyring password if logged on
-- checkhealth gkeep should report all green
