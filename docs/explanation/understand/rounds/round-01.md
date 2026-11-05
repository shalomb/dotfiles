# GRILL ROUND 1 -- topic: /understand navigation and discovery efficiency
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [stance] -- How much authority does the current code have?

CONTEXT:
  We add navigation and discovery enhancements to the /understand
  baseline.
  Code and accepted ADRs 0001 to 0003 are the foundation.

OPTIONS:
  [x] A. Mid-execution  (RECOMMENDED)
         Build on accepted ADRs and working code without
         re-architecture.
  [ ] B. Long horizon
         Re-evaluate core decisions and allow breaking changes.

## Q2 [index.dashboard] -- How must the root URL /r/understand/ present reports?

CONTEXT:
  Nginx currently shows autoindex or 404 at /r/understand/.
  A root index must list all analyzed repositories and their lenses.

OPTIONS:
  [ ] A. Generated static dashboard  (RECOMMENDED)
         Runner updates index.html on each run. Fast to load, zero
         backend.
  [x] B. Client-side dynamic catalog
         Single SPA fetches catalog.json from shadow root. More
         interactive.
  [ ] C. Nginx directory listing only
         Zero build code, but ugly and slow to navigate.

DIAGRAM:
  browser -> /r/understand/        -> index.html (all repos dashboard)
  browser -> /r/understand/<repo>/ -> index.html (per-repo lens history)

## Q3 [nginx.default-file] -- How must nginx resolve directory URLs without an explicit file?

CONTEXT:
  Nginx currently requires full path with report.html or returns 404.
  Directory URLs like /r/understand/<slug>/<lens>/<run>/ must resolve.

OPTIONS:
  [x] A. Configure report.html as default index  (RECOMMENDED)
         Add index report.html index.html to nginx configuration.
         Instant.
  [ ] B. HTTP 301 redirect to report.html
         Extra network round-trip for every page visit.

>> Both A and B?

## Q4 [links.github-navigation] -- How must reports link to source files and external repositories?

CONTEXT:
  Reports cite files and symbols but do not link to remote git hosts.
  Git remotes can point to GitHub, GitLab, or internal hosts.

OPTIONS:
  [x] A. Dual links: local source view and GitHub link  (RECOMMENDED)
         Show both local offline source view and GitHub web link when
         remote.
  [ ] B. Local source views only
         Zero external dependencies, but cannot jump to GitHub UI or PR.
  [ ] C. GitHub links only
         Fails completely when offline or for unpushed commits.

DIAGRAM:
  report node/line -> [Local src/ view] (offline fallback)
                   -> [GitHub blob/commit link] (when remote exists)

## Q5 [discovery.cost-and-quality] -- How must discovery balance token costs against information quality?

CONTEXT:
  Spawning multiple LLM delegates consumes tokens and risks noise.
  Static analysis (codemap, AST, git diff) costs zero tokens.

OPTIONS:
  [x] A. Hybrid: static extraction first, targeted LLM pass  (RECOMMENDED)
         Extract structure deterministically; run LLM delegates only on
         hubs.
  [ ] B. Deterministic static analysis only
         Zero token cost and instant, but lacks high-level intent
         narratives.
  [ ] C. Full LLM delegate swarm
         Maximum narrative depth, but high token cost and slow
         execution.

DIAGRAM:
  codebase -> static pre-scan (codemap/AST, 0 tokens) -> 80% topology
           -> budget-capped targeted delegates       -> 20% deep intent

## TERMS

  Global index: The root HTML document listing all analyzed repositories
  and their recent runs.
    Avoid: landing page, home page
  Remote repository link: A web hyperlink directly to a repository host
  commit or file line.
    Avoid: external link, web link
  Discovery cost: Total LLM token usage incurred across planning,
  discovery, and synthesis phases.
    Avoid: token burn, expensive prompt
