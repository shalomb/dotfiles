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
  python = {

    s("setup-subprocess",
      sn(1, {
        t({
          'from subprocess import Popen, PIPE',
          '',
          'p = Popen(',
          '  cmd,',
          '  cwd=os.getcwd(),',
          '  stdout=PIPE,',
          '  stdin=PIPE,',
          '  stderr=PIPE,',
          ')',
          'stdout, stderr = p.communicate(input=input.encode())',
          'stdout = stdout.decode().strip()',
          'stderr = stderr.decode().strip()',
          'exit_code = p.returncode',
          '',
          'log.debug(f"[{stdout=}]({len(stdout)=}) {exit_code=} {stderr=}")',
        }),
      })),

    s("setup-subprocess",
      sn(1, {
        t({
          'from subprocess import Popen, PIPE',
          'p = Popen(',
          '  cmd,',
          '  cwd=os.getcwd(),',
          '  stdout=PIPE,',
          '  stdin=PIPE,',
          '  stderr=PIPE,',
          ')',
          'stdout, stderr = p.communicate(input=input.encode())',
          'stdout = stdout.decode().strip()',
          'stderr = stderr.decode().strip()',
          'exit_code = p.returncode',
        }),
      })),

    s("setup-logging",
      sn(1, {
        t({
          'import os',
          'import logging',
          'log = logging.getLogger(__name__)',
          'logging.basicConfig(',
          '    encoding="utf-8",',
          '    level=logging.DEBUG if os.environ.get("DEBUG", False) else logging.INFO,',
          ')'
        }),
      })),

    s("log-var", sn(1, {
      t('log.debug(f"{'),
      i(1, ""),
      t('=}")'),
    })),

    s("print-var", sn(1, {
      t('print(f"{'),
      i(1, ""),
      t('=}")'),
    })),

  }
})
