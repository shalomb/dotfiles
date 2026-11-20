---
title: "Four of ten /doc capabilities are tested libraries that no command can reach yet"
eyebrow: "dotfiles · Architecture Report"
tags: [doc, architecture, dotfiles, tooling, report]
---

# Four of ten /doc capabilities are tested libraries that no command can reach yet

**Owner:** dotfiles maintainer · **Status:** Draft · **Data to:** 14 Nov 2026
**Scope:** the ten capabilities in the /doc vision note, on branch `feat/doc-system`. It leaves out the pi-find work.

**In one sentence:** Six of the ten /doc capabilities are built and reachable today, while dossiers, meeting capture, habit-aware ranking and epic dashboards exist only as tested modules with no spec and no command, so "delivered" overstates the state.

## Takeaways

1. Six of ten capabilities are reachable from a command or the published page: search, `doc` CLI, scratch, provenance, adaptive nav and brand isolation ([§1](#evidence))[^1].
2. Four of ten (dossiers, capture, ranking, dashboards) have no importer outside their own tests, against zero expected ([§1](#evidence))[^1].
3. Only the search page and scratch store have a design record; the other eight rest on the vision note alone ([§2](#specs))[^2].
4. We recommend one wiring slice for the four modules, preceded by a decision round on five open questions ([§3](#recommendations)).

## 1. Six capabilities are reachable, four are not {#evidence}

| # | Capability | Reachable from | State |
|---|---|---|---|
| 1 | Search page (landing and docked) | `doc-library.ts` builds `index.html` | Built |
| 2 | `doc` CLI and navigator skill | `.local/bin/doc` | Built |
| 3 | Shadow scratch store and `scratch promote` | `.local/bin/scratch` | Built |
| 4 | Dossiers and zip bundles | nothing | Library only |
| 5 | Adaptive navigation | `doc-publish.ts` | Built |
| 6 | Embedded provenance recipe | `doc-publish.ts` | Built |
| 7 | Meeting capture, zero git taint | nothing | Library only |
| 8 | Habit-aware ranking | nothing | Library only |
| 9 | Brand isolation | `doc-publish.ts` | Built; sandboxing unverified |
| 10 | Epic dashboards | nothing | Library only |

"Reachable" means a non-test file imports the module. We checked imports only and did not run the commands.

[CHECK — brand sandboxing: the vision asks us to verify that corporate styles never reach personal or OSS repos; no test covers it yet.]

## 2. Only two capabilities have a design record {#specs}

The search page and scratch store went through four decision rounds, a handoff spec, acceptance scenarios and ADR-014. The `doc` CLI and dossiers are marked deferred in the decision tree, which is now stale. Capabilities 5 to 10 were built in single "add pure module" commits straight from the vision note, so the code is the only evidence of intent.

## 3. Recommendations {#recommendations}

| Recommendation | Owner | By | Effect |
|---|---|---|---|
| Set the vision and roadmap status to partially delivered | maintainer | [OPEN] | The record matches the code |
| Run a decision round on the open questions below | maintainer | [OPEN] | Specs exist before wiring |
| Wire ranking into `find`/`open`, add `/doc dossier` | maintainer | [OPEN] | Two more capabilities reachable |
| Verify brand sandboxing with a test | maintainer | [OPEN] | Closes the §9 check |

## 4. Risks and asks

[OPEN — zero-taint mechanism: git exclude, `refs/doc/*` or a shadow root. ADR-014 points to the shadow root.]
[OPEN — capture: in-page notes need a write-back path, which conflicts with the no-server stance.]
[OPEN — ranking: where the access log lives and whether it stays local.]
[OPEN — personas: not in scope or built yet; who defines the profiles.]
[OPEN — dashboards: Jira only or GitHub too; live or snapshot data.]

[RISK — the `doc-navigator` skill is committed on `fix/pii-hook-fail-closed` in agent-skills and not merged to `main`.]

## Method and limits

Findings come from reading the branch history, the spec folder and the importers of each module. The earlier claim of 785 Bun and 87 pytest passes is carried over and not re-run [CHECK — rerun both suites before this is final]. Nothing here measures whether the wired modules behave correctly in a real publish.

## Sources

[^1]: [Roadmap delivery table, `docs/specs/doc-system/roadmap.md`](docs/specs/doc-system/roadmap.md)
[^2]: [Decision tree, `docs/specs/doc-system/decision-tree.md`](docs/specs/doc-system/decision-tree.md)
