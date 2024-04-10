local ls = require("luasnip")

-- some shorthands...
local snip = ls.snippet
local node = ls.snippet_node
local text = ls.text_node
local insert = ls.insert_node
local func = ls.function_node
local choice = ls.choice_node
local dynamicn = ls.dynamic_node

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

ls.config.set_config({
  history = true, -- keep around last snippet local to jump back
  enable_autosnippets = true,
})

require("luasnip.loaders.from_vscode").lazy_load()
require("luasnip.loaders.from_lua").lazy_load({ paths = "~/.config/nvim/lua/snippets/" })

local date = function()
  return { os.date "%Y-%m-%d" }
end

local filename = function()
  return { vim.fn.expand "%:p" }
end

-- Make sure to not pass an invalid command, as io.popen() may write over nvim-text.
local function bash(_, _, command)
  local file = io.popen(command, "r")
  local res = {}
  for line in file:lines() do
    table.insert(res, line)
  end
  return res
end

ls.add_snippets(nil, {
  all = {
    snip({
      trig = "date",
      namr = "Date",
      dscr = "Date in the form of YYYY-MM-DD",
    }, {
      func(date, {}),
    }),

    snip({
      trig = "vim",
      namr = "vim modeline",
      dscr = "vim modeline",
    }, {
      text { "# vim: ts=2 sw=2 et" },
      insert(-1)
    }),

    snip({
      trig = "pwd",
      namr = "PWD",
      dscr = "Path to current working directory",
    }, {
      func(bash, {}, { user_args = { "pwd" } }),
    }),

    snip({
      trig = "filename",
      namr = "Filename",
      dscr = "Absolute path to file",
    }, {
      func(filename, {}),
    }),
  },

  sh = {
    snip("shebang", {
      text { "#!/bin/sh", "" },
      insert(0),
    }),

    snip("bashebang", {
      text {
        "#!/bin/bash", "",
        "# Name", "",
        "# Description", "",
        "set -o errexit -o nounset -o noclobber -o pipefail",
        "shopt -s extglob nullglob globstar", "", "",
        "[[ ${DEBUG-} ]] && set -xv", "",
      },
      insert(0),
    }),
  },

  go = {
    snip(
      "iferr",
      {
        text {
          "if err != nil {",
          "\t"
        },
        insert(1),
        text {
          "return nil, err",
          "}"
        },
        insert(2),
      }
    ),

    snip(
      "ic",
      {
        text {
          'log.Printf("%+v", ',
        },
        insert(1),
        text {
          ')'
        },
        insert(2),
      }
    )
  },

  python = {
    snip("shebang", {
      text {
        "#!/usr/bin/env python3", "",
        "# -*- coding: utf-8 -*-", "",
        '"""', "", '"""',
        "", "", ""
      },
      insert(0),
    }),

    s({
      trig = "__",
      namr = "magic methods",
      dscr = "foo"
    }, {
      -- equivalent to "${1:cond} ? ${2:then} : ${3:else}"
      -- i(1, "cond"), t(" ? "), i(2, "then"), t(" : "), i(3, "else")
      i(1, "__"), i(2, "init"), i(3, "__(self, "), i(4, "foo"), i(5, "):"),
      i(6, "\n\t"),
    }),

  },

  terraform = {

    snip("us-east-1", { text { "us-east-1" }, insert(0), }),
    snip("us-west-1", { text { "us-west-1" }, insert(0), }),
    snip("eu-central-1", { text { "eu-central-1" }, insert(0), }),
    snip("ap-northeast-1", { text { "ap-northeast-1" }, insert(0), }),
    snip("ap-southeast-1", { text { "ap-southeast-1" }, insert(0), }),

    snip("ec2", {
      text {
        'module "ec2" {', "", "}",
      },
      insert(0),
    }),

    snip("shebang", {
      text {
        "#! terraform", "",
      },
      insert(0),
    }),

    s({
      trig = "region",
      namr = "var.region",
      dscr = "region"
    }, {
      i(1, 'region = "'),
      i(2, 'var.region'),
      i(3, '"'),
    }),
  },
})
