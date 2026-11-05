# GRILL ROUND 2 -- topic: /understand navigation and discovery efficiency
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [nginx.default-and-redirect] -- How must nginx combine report.html index and directory redirection?

CONTEXT:
  Nginx can serve report.html when a trailing slash is requested (e.g.
  /r/understand/.../run-1/).
  Without a trailing slash, nginx sends an HTTP 301 redirect appending
  the slash, then serves report.html.

OPTIONS:
  [x] A. Index directive plus auto-redirect on missing slash  (RECOMMENDED)
         index report.html index.html handles slashed URLs; nginx
         standard redirection handles unslashed URLs.
  [ ] B. Explicit rewrite rule for unslashed URLs
         Adds regex rewrite rule in nginx config to force immediate
         redirect to report.html.

DIAGRAM:
  GET /.../run-1  --HTTP 301--> GET /.../run-1/  --index--> 200 OK

## Q2 [catalog.schema] -- How must the dynamic catalog store and discover historical runs?

CONTEXT:
  You picked Client-side dynamic catalog (Option B in Round 1).
  The catalog needs metadata: repo slug, lens, timestamp, summary,
  commit, and tags.

OPTIONS:
  [x] A. Single append-only catalog.json in shadow root  (RECOMMENDED)
         Fast client queries, simple schema, instantaneous filtering by
         repo and lens.
  [ ] B. Individual run manifests indexed on the fly by browser
         Client must fetch dozens of run.json files asynchronously. Slow
         on large caches.

DIAGRAM:
  runner  --> appends to catalog.json in shadow root
  browser --> /r/understand/ -> loads SPA -> fetches catalog.json

## Q3 [links.remote-resolver] -- How must the runner resolve git remote URLs for external hyperlinks?

CONTEXT:
  Dual links were chosen (Local source view + Remote repository link).
  Git remotes vary: GitHub (github.com/org/repo), GitLab, or git SSH
  URLs.

OPTIONS:
  [x] A. Deterministic git remote URL parser  (RECOMMENDED)
         Converts SSH and HTTPS git remotes into web URLs with
         commit-pinned blob links.
  [ ] B. Manual config override per repository
         Requires explicit configuration if git remote is unusual or
         absent.

DIAGRAM:
  git remote origin: git@github.com:org/repo.git
  Parsed web base:    https://github.com/org/repo
  Blob URL:           https://github.com/org/repo/blob/<sha>/<path>#L10

## Q4 [discovery.delegate-budgeting] -- How must the hybrid discovery engine constrain LLM delegate expenditure?

CONTEXT:
  Hybrid discovery was chosen: static analysis first, targeted LLM pass
  on key hubs.
  We must establish a token budget and clear trigger conditions for the
  LLM pass.

OPTIONS:
  [x] A. Hard token cap and hub-count threshold  (RECOMMENDED)
         Enforces max 2-3 delegates and strict 8k token ceiling; fall
         back to static on overrun.
  [ ] B. Dynamic allocation based on repo size tier
         Scales tokens with file count, but can get expensive on large
         monorepos.

DIAGRAM:
  Pre-scan (codemap/AST) -> identify hubs & ambiguous contracts
  Hub count <= 3           -> 1 focused delegate (cap 4k tokens)
  Hub count > 3            -> top 3 hubs only (cap 8k tokens total)

## TERMS

  Catalog JSON: A centralized JSON file in the shadow root recording all
  completed runs with search metadata.
    Avoid: manifest collection, file scan
  Commit-pinned web link: A canonical HTTPS web URL linking directly to
  a specific commit and line on GitHub or GitLab.
    Avoid: web remote, git web link
  Token ceiling: A strict maximum token ceiling enforced per analysis
  run to guarantee bounded discovery cost.
    Avoid: unbounded prompt, token explosion
