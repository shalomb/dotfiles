---
status: delivered
related: [vision-and-roadmap.md, handoff-slice-1.md]
---

# /doc roadmap: delivery status

Each vision capability, where it lives, and how it is verified. Source of truth for what is built; the vision doc keeps the intent.

| # | Capability | Code | Tests |
|---|---|---|---|
| 1 | Search page (Landing/Docked) | `.pi/agent/extensions/_lib/doc-search.ts`, `doc-library.ts` | `doc-search.test.ts`, `doc-library.test.ts` |
| 2 | Doc CLI and navigator | `.local/bin/doc`, `docs/how-to/doc-cli.md` | `tests/doc/` |
| 3 | Scratch (shadow store, ADR-014) | `.local/bin/scratch` | `tests/features/scratch.feature` |
| 4 | Dossiers | `_lib/doc-dossier.ts` | `doc-dossier.test.ts` |
| 5 | Adaptive navigation | `_lib/doc-nav.ts` | `doc-nav.test.ts` |
| 6 | Embedded provenance | `_lib/doc-provenance.ts` | `doc-provenance.test.ts` |
| 7 | Meeting capture, zero git taint | `_lib/doc-capture.ts` | `doc-capture.test.ts` |
| 8 | Habit-aware ranking | `_lib/doc-ranking.ts` | `doc-ranking.test.ts` |
| 9 | Brand isolation | `_lib/doc-brand.ts` | `doc-brand.test.ts` |
| 10 | Epic dashboards | `_lib/doc-dashboard.ts` | `doc-dashboard.test.ts` |

## Known gaps

- Scratch promote is now implemented (`scratch promote [--to-doc|--to-obsidian]`).
- Provenance, nav, and brand modules are wired into `doc_publish` / `doc-command.ts`.
- Remaining pure modules (dossiers, capture, ranking, dashboard) are tested libraries; wiring into slash subcommands is scheduled for the next slice.
