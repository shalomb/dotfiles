# `decision` template

Status: template type in `.pi/agent/extensions/_lib/doc-render/templates/` (`decision.py`, `decision.html`, shared `kernel.*`). A structured decision record becomes one self-contained HTML page.
Design source: `docs/prototypes/decision-mock.html`. Sibling of `readout.md`; it shares the tone rules and the fixed gate.

## Run

    python3 .pi/agent/extensions/_lib/doc-render/templates/template.py decision in.json out.html

## Input (JSON)

| Field | Rule |
| :-- | :-- |
| `meta` | `eyebrow`, `title`, `lede`, `asof`, `foot`, all text. Title states a finding: 5+ words, not starting `Decision:`, `Report:` or `Simulation:`. |
| `deadline` | `start`, `today`, `date`, `ask_by` as `YYYY-MM-DD`, in order `start <= today <= date` and `start <= ask_by <= date`; plus `date_label`, `ask_by_note`. |
| `facts` | Optional list of `{value, label}` shown beside the day count. |
| `options` | 2 or more of `{id, title, pro, con, note}`. Exactly one has `recommended: true`. |
| `why` | The reason for the recommendation. Required. |
| `needs` | List of `{need, from, by}`. |
| `reply` | Optional `{to, text}`: a draft for a human to post. |
| `glossary` | `{term: plain meaning}`. |

## Rules the renderer enforces

- The author picks the recommendation. The renderer only checks that exactly one option has it, with a `why`.
- Tone: hype words are rejected, and jargon (ALB, ACM, PITR, GSI, TFC, APMS, SG, EBS, ROAM) needs a glossary entry. Same lists as the readout, both in `kernel.py`.
- Brand, theme and style keys anywhere in the input are rejected (see `kernel.md`).
- Every error reads `error: <field path>: <reason>`.

## Fixed by the renderer

- The banner "Nothing here is approved." is built by `kernel.py` with the constant `GATE_DETAIL` from `decision.py`. Input cannot change or remove it; unknown keys such as `gate` are dropped.
- The reply is shown as text headed "a human posts it". No links or mail actions.
- The footer says the recommendation is untested.
- No network calls, no `innerHTML`, no external `src` or `href`.

## Derived

`days_left`, `elapsed_pct` and `ask_by_pct` (for the countdown bar), option and need counts.

## Not in scope

Editions, refresh, rollups, a no-JS fallback, wiring into `doc_publish`.
