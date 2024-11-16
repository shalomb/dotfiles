local ls = require("luasnip")

-- some shorthands...
local snip = ls.snippet
local sn = ls.snippet_node
local t = ls.text_node
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

ls.add_snippets("all", {

  s("shebang-env", {
    t("#!/usr/bin/env ")
  }),

  s("shebang-python", sn(1, {
    t({
      "#!/usr/bin/env python3",
      "",
      "# -*- coding: utf-8 -*-",
      "",
      '""" """                ',
      "",
      "import icecream",
      "",
      'if __name__ == "__main__":',
      '    main()'
    }),
    i(2, "")
  })),

  s("shebang-bash", sn(1, {
    t({
      "#!/bin/bash",
      "",
      "# Name",
      "",
      "# Description",
      "",
      "# Usage",
      "",
      "",
      "set -o errexit -o nounset -o pipefail",
      "shopt -s extglob nullglob globstar",
      "",
      "[[ ${DEBUG-} != 0 ]] && set -xv",
      "",
      "",
    }),
    i(2, "")
  })),

  s("TODO", {
    t("# TODO: ")
  }),

})
