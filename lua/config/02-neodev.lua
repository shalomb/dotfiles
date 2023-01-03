-- lua


-- You can override the default detection using the override function
-- EXAMPLE: If you want a certain directory to be configured differently, you can override its settings
require("neodev").setup({
  override = function(root_dir, library)
    if require("neodev.util").has_file(root_dir, "/etc/nixos") then
      library.enabled = true
      library.plugins = true
    end
  end,
})

