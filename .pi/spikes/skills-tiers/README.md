# Spikes: tiered skills loader (throwaway)
Design notes: ../../ideas.md. Extension is loaded with `pi -e`, never installed.
- A: does mutating `systemPromptOptions.skills` shrink the catalog? (input tokens: off vs allow vs none)
- B: can the model still `read` a hidden skill's SKILL.md by path?
- C: does `/skill:name` still expand for a skill filtered out of the catalog?
- D: cache-friendliness: identical filtered catalog across two runs (cached input tokens)
Run: `./run.sh A|B|C|D|all`; output in out/ (gitignore it). Override model with SPIKE_MODEL.

## Loader spike (skills-loader.ts, skills-picker.sh)
Run: `SPIKE_LOG=out/loader.log pi -e $PWD/skills-loader.ts --model anthropic/claude-haiku-4-5 --mode json --no-session "Reply: ok" "/skills:loader uv" "..."`
Findings: `skills:loader` registers and runs; catalog is only capturable from before_agent_start (status before the first turn shows 0);
load adds the catalog entry on the next turn and the body arrives as a nextTurn message; unknown names are reported.
Not covered headlessly: the tmux popup itself (needs an interactive pane).
