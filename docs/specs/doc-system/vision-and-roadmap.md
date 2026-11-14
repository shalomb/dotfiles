---
title: "/doc — Vision, Concepts & Capability Evolution"
tags: [pi, doc, ideas, tooling, documentation, architecture]
status: draft-synthesis
created: 2026-11-14
---

# /doc — Vision, Concepts & Capability Evolution

## Executive Thesis
`/doc` must evolve beyond generating isolated, linear Markdown/HTML pages. Its true role is as a **cohesive documentation and communication operating system**:
1. **Homepage Search UX**: Google-style landing with collapsible legend and a search bar that floats and docks to the top on query.
2. **Dedicated Document CLI & Skill**: Headless command-line tool (`doc-cli` / `pi doc`) and skill wrapper to query by title, tag, origin workspace, or date, and jump straight into reproduction or feedback loops.
3. **Shadow Scratch System (`/scratch`)**: A persistent scratch CLI/slash command creating durable scratch documents in an XDG shadow store that survives reboots and `systemd-tmpfiles` sweeps without dirtying git worktrees.
4. **Dossiers & Meta-Docs**: Bundling disparate artifacts into portable, self-contained packages.
5. **Dynamic & Non-Intrusive UX**: Reading interfaces that adapt to presentations, mobile, and desktop.
6. **Reproducibility Without Assumptions**: Embedding the prompt, lineage, and audience preferences into the artifact itself so any reader can regenerate it without local file dependencies.
7. **Clean Workspace Collaboration**: Capturing live meeting notes and hosting docs directly in git worktrees without tainting the repository.
8. **Context- & Habit-Aware Surfacing**: Automatically bubbling up relevant status docs based on time of day, cadence, and recurring meeting habits.
9. **"Pictures of Stories"**: Higher-order visual dashboards turning dense Jira epics and initiatives into readable, executive-ready synopses.

---

## 1. Homepage Search & Catalog UX (Google-Style Landing → Compact Sticky Search)

### The Problem
The current `/doc` index/homepage (`docRoot()/index.html`) acts as the entry door to the document library. When idle, having guidance and legend (available tags, doc types like `decision|report|status`, syntax hints like `press / to focus`) is essential for discoverability. However, once the user starts searching, this static legend becomes visual clutter that gets in the way of browsing documents.

### The Desired Interaction
* **Idle Landing ("Google Homepage")**:
  * Centered layout: clean title, prominent search input, and a helpful, non-distracting legend/tag cloud beneath.
* **Active Search Transition**:
  * **Legend Folds Away**: The moment the user types a query, the legend/guidance smoothly minimizes or collapses away into a subtle, recoverable pill or `<details>` toggle.
  * **Floating / Docked Header**: The search input smoothly scales down and **floats to the top of the viewport**, pinning as a compact sticky header bar.
  * **Result Grid Focus**: The viewport below is dedicated entirely to the responsive card grid of matching documents.
  * **Zero Friction Reset**: Clearing the input or pressing Escape transitions the view back to the clean, centered landing state with the full legend restored.

---

## 2. Dedicated Document CLI & Skill Wrapper (`doc-cli` / `doc-navigator`)

### The Problem
Today, finding a filed document and tracing it back to its authoring workspace requires either opening the browser index (`/doc open`) or using conversational slash commands inside an active Pi session. When working in terminal shells, scripts, or agent workflows, there is no fast, headless CLI to discover documents, inspect their origin repositories, or immediately hop back into the workspace to apply feedback or re-run a generation.

### The Solution: Headless CLI & Skill Wrapper
* **`doc-cli` Tool**:
  * Rich terminal query interface over `index.json` and document metadata:
    ```bash
    doc find <query>                   # search by title, summary, or keyword
    doc list --tag <tag> --kind <kind> # filter by tag, purpose, date
    doc origin <id|path>               # print origin git repo, worktree, and source path
    doc source <id|path>               # print or open the underlying source Markdown
    doc export <id|path> --zip         # pack document, assets, and metadata into a zip
    ```
  * Output formats: human-readable aligned tables, path-only output for piping (`xargs`, `fzf`), or machine-readable JSON (`--json`).
* **Skill Wrapper (`doc-navigator` / `/doc:find`)**:
  * Exposes the CLI capabilities cleanly to AI agents.
  * Closes the feedback and iteration loop: an agent can look up a past document by topic or workspace, locate its original Markdown source and worktree, inspect the prompt that produced it, and seamlessly resume editing or incorporating stakeholder meeting feedback.

---

## 3. Persistent Shadow Scratch System (`/scratch` & `scratch` CLI)

### The Problem
When working across multiple agents and tasks, the common developer reflex is to open an editor on a transient file (`nvim /tmp/notes.md`) to jot thoughts down without cluttering git trees or polluting workspaces. 

However, `/tmp` has fatal flaws:
1. **Reboot & Cleanup Loss**: System reboots, `systemd-tmpfiles-clean`, or tmpfs wipes delete active drafts.
2. **Neovim Temp Disablement**: Persistent undo files are frequently disabled by default in `/tmp/*` or `/dev/shm/*` to prevent leaking sensitive credentials, leaving files unrecoverable if uncommitted.
3. **Repository Disconnect**: Ad-hoc files in `/tmp` lose their relationship to the active repository, worktree, and branch.

### The Solution: Shadow Scratch Store (Following `todo-navigator` & `/goal`)
* **Dedicated Scratch Command & CLI**:
  * Shell CLI: `scratch [name]` or `/scratch [name]` slash command inside Pi.
  * Spawns `$EDITOR` (or Neovim) directly on a dedicated scratch file.
* **XDG Shadow Hierarchy**:
  * Stored under `~/.cache/agent-skills/scratch/<repo-slug>/<worktree-or-branch>/` (or `$XDG_STATE_HOME/pi/scratch/`).
  * **Shadows the Current Repo & Worktrees**: Just like `todo-navigator` maintains task cards in shadow storage without touching repo files, `/scratch` automatically associates notes with the current workspace.
  * **Survives Reboots & Cleanups**: Safe from ephemeral tmpfs purges.
  * **Full Persistent Undo Enabled**: Because it is in a standard non-tmp path, Neovim's persistent undo files (`undofile`) remain fully functional.
* **Agent Interoperability**:
  * Other agents can immediately read or append to the current branch's scratch notes via `read ~/.cache/.../scratch/...` or a dedicated tool, enabling seamless agent handoffs without dirtying `git status`.
  * Allows quick promotion: `scratch file` or `scratch promote` can turn a mature scratch note into a formal `/doc` document or Obsidian note with one command.

---

## 4. Meta-Docs & Dossier Packages ("The Hopping-Board")

### The Problem
Complex initiatives do not fit into single documents. Context fractures across ADRs, Jira tickets, Obsidian notes, git diffs, and session transcripts. Readers and presenters waste cognitive energy jumping between disjoint tools.

### The Solution: Dossier as a First-Class `/doc`
* **The Hopping-Board Concept**: A meta-document acting as an orientation hub and launchpad. It provides an executive synthesis up front and curated "hop-points" (links, snapshots, embedded cards) into deep-dive artifacts.
* **Portable Bundles / Zips**:
  * Ability to pack a dossier and its referenced assets into a single clean `.zip` or self-contained package.
  * Colleague-friendly: shareable across Slack, email, or SharePoint without broken assets or private path leaks.
* **Meeting-Tailored Subsets**:
  * Ability to slice a large initiative's dossier into a scoped subset tailored for a 30-minute sync, steering committee, or architecture review.

---

## 5. Dynamic Reading Interface (Floating Adaptive Navigation)

### The Problem
Fixed sidebar navigation consumes vital horizontal screen space on laptops, split panes, and mobile devices, often obscuring tables, code, and diagrams.

### The Solution
* **Transformative Nav Bar**:
  * On large screens, standard sidebar navigation provides quick orientation.
  * On scroll, resize, or explicit toggle, the navigation bar collapses and **floats to the top of the viewport**.
  * Stays sticky and accessible on click without permanently stealing width from the document body.

---

## 6. Reproducible Documents (Self-Contained Lineage & Audience Preferences)

### The Problem
When documents are shared as rendered outputs, their recipe is lost. Nobody knows which prompt, source files, or assumptions produced them. Furthermore, recurring documents drift in tone and structure because stakeholder preferences aren't recorded.

### The Solution: Embedded Provenance
* **Folded Recipe / Prompt Block**:
  * Every generated document includes a folded/collapsed `<details>` section containing:
    * The exact synthesis prompt and parameters.
    * Upstream source references and timestamps.
    * An execution contract so the reader can re-run and rebuild the document in their own workspace without assuming private local file paths.
* **Audience Persona & Preference Profiles**:
  * Stakeholder preferences (e.g., "CTO prefers bulleted risk tables; Product Lead prefers user journey diagrams; Compliance requires ISO clause matrices") are declared and baked into document metadata.
  * When a recurring document is refreshed or reproduced, the prompt automatically enforces these preferences.

---

## 7. Live Meeting Capture & Zero-Taint Git Worktrees

### The Problem
During meetings and reviews, decisions and feedback happen live. Taking notes in a disconnected scratchpad disconnects the feedback from the document sections. Meanwhile, keeping working documents in a git worktree risks dirtying `git status` or accidentally committing transient files.

### The Solution
* **Live In-Doc Margin Capture**:
  * Lightweight annotation notes beside sections during presentations to capture feedback and questions in context (without trying to become full MS Word / PowerPoint).
  * Automatically pipes captured feedback back into the local workspace where the document is housed.
* **Non-Tainting Worktree Integration**:
  * Store and serve `/doc` artifacts and live meeting annotations seamlessly from inside active git worktrees.
  * Backed by private git excludes (`.git/info/exclude`), git refs (`refs/doc/*`), or shadow cache roots so the worktree's git index and branch commits remain 100% pristine.

---

## 8. Habit-Aware & Temporal Surfacing (Smart Retrieval)

### The Problem
In live meetings, presenters often fumble through nested directories or cluttered terminals searching for the right deck or status report while an audience waits.

### The Solution
* **Temporal & Cadence Weighting**:
  * The retrieval engine tracks when documents are accessed across days and weeks (e.g., daily standup at 09:30, Friday sprint retro, bi-weekly architecture board).
  * In `/doc find` or `/doc open`, documents correlated with the current time window are given higher ranking.
* **Automatic Status Bubbling**:
  * Active living status reports and dashboards naturally bubble to the top of search/open recommendations right when they are needed.

---

## 9. Corporate Brand & CSS Isolation

### Principle
* **Brand Sandboxing**:
  * Corporate stylesheets (e.g. `style: formal`) should strictly apply only within corporate enterprise contexts.
  * Personal, OSS, and cross-client repositories must remain completely decoupled from proprietary corporate branding.
  * *Status*: Implemented via `brands.py` / domain detection; verify strict sandboxing to prevent cross-contamination.

---

## 10. Higher-Order Visuals: "Pictures of Stories" (Epic & Initiative Dashboards)

### The Problem
Stakeholders dread walls of text. Traditional markdown reports fail to communicate the momentum and health of complex epics and programs.

### The Solution: Visual Status Dashboards
* **Visual Synopses**:
  * Transform Jira epics, GitHub milestones, or architectural programs into single-glance visual dashboards ("pictures of stories"):
    1. Overall health and status at a glance.
    2. Real-time Work in Progress (WIP) and throughput metrics.
    3. Variance vs. trajectory/expectations.
    4. Emerging bottlenecks, blocker dependencies, and risk exposure.
* **Composition Architecture**:
  * Sits as a higher-order skill/extension combining:
    * Data extraction (`jira-dag`, `jira-issue-manager`, git forensics).
    * Core layout and presentation engine (`/doc`, Marp, Mermaid, CSS widgets).
    * Interactive presentation packaging.
