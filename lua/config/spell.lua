-- lua

-- Enable spell checking for certain file types
vim.api.nvim_create_augroup("spell", { clear = true })
vim.api.nvim_create_autocmd(
  { "BufRead", "BufNewFile" },
  { pattern = { "*.txt", "*.md", "*.tex" },
    group = 'spell',
    command = "setlocal spell" }
)
