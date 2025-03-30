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
  sh = {

    s("this_dir",
      sn(1, {
        t({
          'THIS_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)',
        }),
      })),

    s("cleanup",
      sn(1, {
        t({
          'cleanup() {',
          '  echo "Running cleanup"',
          '}',
          "trap 'cleanup' ERR EXIT",
          '',
        }),
      })),

    s("main", sn(1, {
      t({
        'main() {',
        '  do_something "$@"',
        '}',
        '',
        'if ! (return 0 2>/dev/null); then',
        '  main "$@"',
      }),
      i(1, ""),
      t({
        '',
        'fi'
      }),
    })),

    s("setup-logging",
      sn(1, {
        t({
          'exec &> >( while read -r line; do',
          '  printf "%s: %s" "$(date +%FT%T%n)" "$line"',
          'done )'
        }),
      })),

    s("log-var", sn(1, {
      t('printf "%s" "${'),
      i(1, ''),
      t('@A}" >&2')
    })),

    s("has", sn(1, {
      t({
        'has()  { command -v "$@" &>/dev/null; }',
      }),
    })),

    s("params", sn(1, {
      t({
        'verbose=0',
        '',
        'OPTIND=1',
        'parse-params() {',
        '  while :; do',
        '    case $1 in',
        '      -h|-\\?|--help)',
        '        usage; exit;',
        '      ;;',
        '      -v|--verbose)',
        '        verbose=$((verbose + 1))',
        '      ;;',
        '      --)',
        '        shift; break;',
        '      ;;',
        '      -?*)',
        "        printf 'WARNING: Unknown option (ignored): %s' \"$1\" >&2",
        '      ;;',
        '      *)',
        '        break',
        '    esac',
        '  done',
        '}',
        'shift $((OPTIND-1))  # $@ now has left-over args',
        '',
      }),
    })),

    s("usage", sn(1, {
      t({
        'usage() {',
        'cat <<-EOF',
        'Usage:',
        'Do stuff and return stuff.',
        '  -v|--verbose   Display verbose output',
        '  -h|--help      Display this help message',
        'EOF',
        '}',
        '',
      }),
    })),

    s("echo-utils", sn(1, {
      t({
        'say()  { printf "---- %s ----\\n" "$*" >&2; }',
        'warn() { printf "%s" "${@+$@$\'\\n\'}"; >&2; }',
        'die()  { warn "$@"; exit "${2:-11}"; }',
        '',
      }),
    })),

    s("log-utils", sn(1, {
      t({
        'log()  {',
        '  if [[ ! -t 0 ]]; then',
        '    logger --no-act -si -p local0."${LEVEL:-warning}"',
        '  else',
        '    logger --no-act -si -p local0."${LEVEL:-warning}" "$@"',
        '  fi',
        '}',
      }),
    })),

  }
})
