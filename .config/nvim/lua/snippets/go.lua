--- lua

local ls = require("luasnip")

-- some shorthands...
local s = ls.snippet
local sn = ls.snippet_node
local isn = ls.indent_snippet_node
local t = ls.text_node
local i = ls.insert_node
local f = ls.function_node
local c = ls.choice_node
local d = ls.dynamic_node
local r = ls.restore_node
local events = require("luasnip.util.events")
local ai = require("luasnip.nodes.absolute_indexer")
local extras = require("luasnip.extras")
local l = extras.lambda
local rep = extras.rep
local p = extras.partial
local m = extras.match
local n = extras.nonempty
local dl = extras.dynamic_lambda
local fmt = require("luasnip.extras.fmt").fmt
local fmta = require("luasnip.extras.fmt").fmta
local conds = require("luasnip.extras.expand_conditions")
local postfix = require("luasnip.extras.postfix").postfix
local types = require("luasnip.util.types")
local parse = require("luasnip.util.parser").parse_snippet
local ms = ls.multi_snippet
local k = require("luasnip.nodes.key_indexer").new_key

local snip = ls.snippet
local node = ls.snippet_node
local text = ls.text_node
local insert = ls.insert_node
local func = ls.function_node
local choice = ls.choice_node
local dynamicn = ls.dynamic_node

ls.config.set_config({
  history = true, -- keep around last snippet local to jump back
  enable_autosnippets = true,
})

ls.add_snippets(nil, {
  go = {
    s("if-err-not-nil", sn(1, {
      t('if err != nil {'),
      i(1, ""),
      t('}'),
    })),

    s("logrus", sn(1, {
      t('log "github.com/sirupsen/logrus"'),
    })),

    s("log-debugf", sn(1, {
      t('log.Debugf("'),
      i(1, ""),
      t('%+v", '),
      i(2, ""),
      t(')'),
    })),

    s("log-printf", sn(1, {
      t('log.Printf("'),
      i(1, ""),
      t('%+v", '),
      i(2, ""),
      t(')'),
    })),

  },
})
