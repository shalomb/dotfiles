local augroup = vim.api.nvim_create_augroup
local autocmd = vim.api.nvim_create_autocmd

local buffer_only_opts = {
  et = true, ts = true, sts = true, sw = true, tw = true, ai = true, cin = true, ft = true
}
local global_opts = {
  ff = true, enc = true, fenc = true
}

local function set_buffer_options(opts)
  for k, v in pairs(opts) do
    if buffer_only_opts[k] then
      vim.bo[k] = v
    elseif global_opts[k] then
      vim.o[k] = v
    end
  end
end

local lang_settings = {
  go = { et = true, ts = 4, sts = 4, sw = 4, tw = 99, ai = true, cin = true, ff = "unix", enc = "utf-8", fenc = "utf-8" },
  lua = { et = true, ts = 2, sts = 2, sw = 2, tw = 78, ai = true, cin = true, ff = "unix", enc = "utf-8", fenc = "utf-8" },
  python = { et = true, ts = 4, sts = 4, sw = 4, tw = 78, ai = true, cin = true, ff = "unix", enc = "utf-8", fenc = "utf-8" },
  terraform = { et = true, ts = 4, sts = 4, sw = 4, tw = 78, ai = true, cin = true, ff = "unix", enc = "utf-8", fenc = "utf-8", ft = "terraform" },
}

for lang, opts in pairs(lang_settings) do
  local group = augroup(lang .. "_settings", { clear = true })
  autocmd({ "BufNewFile", "BufRead" }, {
    group = group,
    pattern = "*." .. (lang == "terraform" and "tf" or lang),
    callback = function() set_buffer_options(opts) end
  })
end

-- Gitcommit settings
local gitcommit_group = augroup('gitcommit_settings', { clear = true })
autocmd('FileType', {
  group = gitcommit_group,
  pattern = 'gitcommit',
  command = '1 | setlocal spell tw=72 colorcolumn+=51 colorcolumn+=73'
})
