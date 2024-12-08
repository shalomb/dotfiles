require('ufo').setup({
  provider_selector = function(bufnr, filetype, buftype)
    return { 'treesitter', 'indent' }
  end
})

vim.o.foldcolumn = '1' -- '0' is not bad
vim.o.foldenable = true
vim.o.foldlevel = 20   -- Using ufo provider need a large value, feel free to decrease the valuek
vim.o.foldlevelstart = 20

-- Using ufo provider need remap `zR` and `zM`. If Neovim is 0.6.1, remap yourself
vim.keymap.set('n', 'zR', require('ufo').openAllFolds)
vim.keymap.set('n', 'zM', require('ufo').closeAllFolds)
