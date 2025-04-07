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
      '""" """                ',
      "",
      "from icecream import ic",
      "import sys",
      "",
      "",
      "def main() -> int:",
      "    return 0",
      "",
      "",
      'if __name__ == "__main__":',
      '    sys.exit(main())'
    }),
    i(2, "")
  })),

  s("shebang-bash", sn(1, {
    t({
      "#!/bin/bash",
      "",
      "# Description",
      "",
      "",
      "set -o errexit -o nounset -o pipefail",
      "set -o errtrace         # Ensure the error trap handler is inherited",
      "shopt -s extglob nullglob globstar",
      "",
      "[[ -n ${DEBUG-} && ${DEBUG-} != 0 ]] && set -o xtrace verbose",
      "",
      "",
    }),
    i(1, ''),
    t({
      "",
      "",
      "# vim: syntax=sh cc=80 tw=79 ts=2 sw=2 sts=2 et sr"
    }),
    -- TODO
    -- Colors via tput
    -- Cleanup
    -- Usage
    -- main
    i(2, "")
  })),

  s("TODO", {
    t("# TODO: ")
  }),

})
