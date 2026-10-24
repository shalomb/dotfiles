#!/usr/bin/env bash
# Spikes for the tiered skills loader. Usage: ./run.sh A|B|C|D|all   (each makes 1-2 tiny Haiku calls)
set -u
cd "$(dirname "$0")" || exit 1; mkdir -p out
EXT="$PWD/tier-filter.ts"; MODEL="${SPIKE_MODEL:-anthropic/claude-haiku-4-5}"
KEEP="modern-cli-overrides,git-commit-formatter,test-driven-development,farley-tdd,verification-before-completion"
pi_run() { # mode keep prompt outfile
  SPIKE_MODE="$1" SPIKE_KEEP="$2" SPIKE_LOG="out/filter.log" \
    pi -e "$EXT" --model "$MODEL" --mode json --no-session "$3" >"$4" 2>"$4.err"
}
tok() { jq -sc '[.[] | .. | objects | select(has("totalTokens"))] | last | {input,cacheRead,cacheWrite,totalTokens}' "$1" 2>/dev/null; }

A() { # does mutating options.skills shrink the catalog? (compare input tokens)
  for m in off allow none; do pi_run "$m" "$KEEP" "Reply with the single word: ok" "out/A-$m.jsonl"; echo "A $m usage: $(tok out/A-$m.jsonl)"; done
  echo "A filter log:"; jq -c '{mode,before,after,promptCharsBeforeMutation}' out/filter.log
}
B() { # can the model still read a hidden skill by path?
  p=$(fd -a -p 'tmux-remote-control/SKILL.md$' ~/.pi/agent/skills | head -1)
  pi_run none "" "Use the read tool on $p and reply with only its first markdown heading." out/B.jsonl
  echo "B read calls:"; jq -c 'select(.. | objects | select(.name?=="read")?) | 1' out/B.jsonl | wc -l
  rg -c 'Tmux Skill' out/B.jsonl || echo "B: heading NOT found"
}
C() { # does /skill:name still expand when the skill is filtered out of the catalog?
  pi_run none "" "/skill:uv say hi" out/C.jsonl
  rg -c 'uv run|uv add|inline script' out/C.jsonl && echo "C: body expanded" || echo "C: body NOT expanded (see out/C.jsonl.err)"
}
D() { # does a filtered catalog get re-sent identically (cache-friendly)? run allow twice, compare cached tokens
  for i in 1 2; do pi_run allow "$KEEP" "Reply with the single word: ok" "out/D-$i.jsonl"; echo "D run$i usage: $(tok out/D-$i.jsonl)"; done
}
case "${1:-all}" in A|B|C|D) "$1";; all) A; B; C; D;; *) echo "usage: $0 A|B|C|D|all";; esac
