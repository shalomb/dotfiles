# GRILL ROUND 4 -- topic: /understand navigation and discovery efficiency
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

# Q1 [review.approval] -- Do you approve the /understand navigation and discovery design?

CONTEXT:
  All 12 functional, WAF, and navigation nodes have settled cleanly
  across rounds 1-3.
  The review document contains the decision tree, the draft handoff, and
  the updated glossary.

OPTIONS:
  [x] A. Approve handoff and start build  (RECOMMENDED)
         Locks the design, exports ADR-0004 & ADR-0005, and enters
         implementation.
  [ ] B. Reopen decisions
         Halts progression to modify specific frontier nodes.

## REVIEW

  # /understand: Navigation, Catalog & Discovery Efficiency (Handoff Review)

  ## 1. Decision Tree

  - [x] stance: Mid-execution (Code & ADRs 0001-0003 are the foundation)
  - [x] index.dashboard: Client-side dynamic catalog (SPA in shadow root fetching catalog.json)
  - [x] nginx.default-file: Configure report.html as default index with standard redirection
  - [x] nginx.default-and-redirect: Index directive for slashed URLs + 301 auto-redirect on missing slash
  - [x] catalog.schema: Single append-only catalog.json in shadow root
  - [x] links.github-navigation: Dual links (Local source view primary + Remote repository link secondary)
  - [x] links.remote-resolver: Deterministic git remote URL parser (SSH & HTTPS -> web commit blob URLs)
  - [x] discovery.cost-and-quality: Hybrid discovery (static extraction first, targeted LLM pass on key hubs)
  - [x] discovery.delegate-budgeting: Hard token cap (<=8k tokens) & max 2-3 delegates triggered only on complex hubs
  - [x] waf.cost-and-latency-ceiling: Hard 30s timeout per delegate with automatic static fallback
  - [x] waf.concurrency-and-contention: File lock (fcntl) with atomic write-rename for catalog.json
  - [x] waf.partial-failure-salvage: Local source view is primary (offline guaranteed); remote link is secondary badge
  - [x] waf.cold-start-and-edge-cases: Self-bootstrapping catalog with empty-state UI
  - [x] waf.falsifiable-hypotheses: Quantitative gates:
        - H1: Catalog SPA loads in <200ms and filters instantly
        - H2: 100% accurate remote blob link resolution for GitHub/GitLab
        - H3: Hybrid discovery strictly adheres to <=8k token ceiling and <45s wall clock

  ## 2. Draft Handoff Spec

  ### Component 1: Report Server & Nginx Directory Resolution
  - Update nginx config template (`report_server/nginx_conf.py`):
    `index report.html index.html;` inside `/r/` location block.
  - Nginx automatically handles trailing slashes (`/r/understand/.../run/` -> serves `report.html`). Unslashed requests receive standard 301 redirection.

  ### Component 2: Client-Side Catalog Dashboard (`/r/understand/index.html`)
  - Static SPA placed at `${XDG_CACHE_HOME:-~/.cache}/agent-skills/understand/index.html`.
  - Fetches `${XDG_CACHE_HOME:-~/.cache}/agent-skills/understand/catalog.json`.
  - Provides instant search by repository name, lens type, branch/commit, and timestamp.
  - Atomic concurrency: Python runner uses `catalog.json.lock` + atomic rename when appending new run manifests.

  ### Component 3: Bi-Directional Dual Navigation Links
  - Runner parses `git remote get-url origin` deterministically:
    - Supports `git@github.com:org/repo.git` -> `https://github.com/org/repo`
    - Supports `https://github.com/org/repo.git` -> `https://github.com/org/repo`
  - Source citations emit:
    1. Primary offline link: `src/<path>.html#L<line>`
    2. Secondary web badge: `https://github.com/<org>/<repo>/blob/<commit>/<path>#L<line>` with external icon.

  ### Component 4: Hybrid Discovery with Token & Latency Safeguards
  - Pre-scan extracts directory structure, language profiles, and dependency graph (`codemap --deps` / AST) at 0 token cost.
  - If hubs exist and need semantic synthesis:
    - Launches maximum 2-3 read-only `bg_delegate` (inspect) workers strictly on top hubs.
    - Enforces hard 30s timeout and 8,000 token budget per run.
    - On timeout or failure: silently keeps deterministic static analysis, ensuring 100% reliable report generation.

## TERMS

  Catalog SPA: The dynamic client-side SPA dashboard served at
  /r/understand/.
    Avoid: home page
  Remote repository link: A commit-pinned HTTPS URL linking directly to
  a specific source line on GitHub or GitLab.
    Avoid: external link
  Discovery token ceiling: Hard 8,000 token ceiling enforced across all
  LLM delegates during discovery.
    Avoid: token burn
