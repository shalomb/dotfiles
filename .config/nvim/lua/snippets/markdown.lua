local ls = require("luasnip")

-- some shorthands...
local snip = ls.snippet
local sn = ls.snippet_node
local t = ls.text_node
local c = ls.choice_node
local node = ls.snippet_node
local text = ls.text_node
local insert = ls.insert_node
local func = ls.function_node
local choice = ls.choice_node
local dynamicn = ls.dynamic_node
local i = ls.insert_node
local s = ls.snippet

ls.config.set_config({
  history = true, -- keep around last snippet local to jump back
  enable_autosnippets = true,
})

-- Make sure to not pass an invalid command, as io.popen() may write over nvim-text.
local function bash(_, _, command)
  local file = io.popen(command, "r")
  local res = {}
  for line in file:lines() do
    table.insert(res, line)
  end
  return res
end

-- args is a table, where 1 is the text in Placeholder 1, 2 the text in
-- placeholder 2,...
local function copy(args)
  return args[1]
end

ls.add_snippets(nil, {
  markdown = {
    s("frontmatter", {
      t({ "---", "" }),
      t("id: "), i(1, ""), t({ "", "" }),
      t({ "aliases: ", "  - " }), i(2, ""), t({ "", "" }),
      t({ "tags: ", "  - " }), i(3, ""), t({ "", "" }),
      t({ "---", "" }),
      t({ "#", "" }), i(4, ""), t({ "", "" }),
      i(0),
    }),

  }
})
