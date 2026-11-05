# GRILL ROUND 3 -- topic: /understand adversarial stress-test & falsifiability (WAF)
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [waf.cost-and-latency-ceiling] -- How must the discovery engine enforce the cost and latency ceiling?

CONTEXT:
  If an LLM delegate runs slow, times out, or exceeds its 4k/8k token
  ceiling, the run could hang.
  We need a hard ceiling and partial-failure salvage rule.

OPTIONS:
  [x] A. Hard 30s timeout per delegate with static fallback  (RECOMMENDED)
         Kill runaway delegates immediately; bundle keeps deterministic
         static analysis.
  [ ] B. Retry once with reduced prompt context
         Doubles latency and token cost when an LLM provider is
         degraded.

DIAGRAM:
  delegate starts -> timer/token monitor
  if timeout (>30s) or cap (>8k tokens) -> kill & keep static

## Q2 [waf.concurrency-and-contention] -- How must concurrent report runs update the shared catalog?

CONTEXT:
  Two agent sessions or CLI commands could analyze the same repository
  at the same time.
  Both could try to append to catalog.json in the shadow root
  simultaneously.

OPTIONS:
  [x] A. File lock with atomic write-rename for catalog.json  (RECOMMENDED)
         Use fcntl lock and atomic rename. Prevents race conditions and
         corrupt catalog.
  [ ] B. Append-only JSON lines log (catalog.jsonl)
         Fast writes, but browser SPA must parse and aggregate all lines
         on load.

DIAGRAM:
  Session 1 --\
                +--> file lock on catalog.json.lock --> atomic write
  Session 2 --/

## Q3 [waf.partial-failure-salvage] -- How must navigation degrade gracefully when offline or git remote is unreachable?

CONTEXT:
  Offline browsing must work without remote internet or GitHub access.
  If the device is offline or the remote repo is private/inaccessible,
  GitHub links will fail.

OPTIONS:
  [x] A. Local source view is primary; remote link is secondary  (RECOMMENDED)
         Anchor clicks default to offline local source views; remote
         link is an optional badge.
  [ ] B. Remote link is primary when remote exists
         Breaks immediately when developer is offline or airplane mode.

DIAGRAM:
  [Source View] -> src/app.ts.html#L10 (offline guaranteed)
  [GitHub]      -> https://github.com/.../app.ts#L10 (external icon)

## Q4 [waf.cold-start-and-edge-cases] -- How must the catalog SPA behave on cold-start or empty cache?

CONTEXT:
  On a brand new installation or cold cache, catalog.json does not
  exist.
  A repository might have 0 commits, empty git history, or 1 single
  file.

OPTIONS:
  [x] A. Self-bootstrapping catalog with empty-state UI  (RECOMMENDED)
         SPA renders helpful onboarding empty-state if catalog.json is
         missing or empty.
  [ ] B. Fail loudly until first full run is generated
         User sees 404 until a report has been produced.

## Q5 [waf.falsifiable-hypotheses] -- Which falsifiable hypotheses gate acceptance of this milestone?

CONTEXT:
  We must define falsifiable hypotheses with measurable pass/fail
  thresholds before building.
  H1: Catalog page loads in <200ms with instant search. H2: Remote links
  accurately navigate to commit blobs on GitHub. H3: Hybrid discovery
  stays under 8k tokens and completes in <45s.

OPTIONS:
  [x] A. Adopt quantitative gates (H1 <200ms, H2 URL, H3 <=8k)  (RECOMMENDED)
         Quantifiable validation gates tested before declaring done.
  [ ] B. Qualitative evaluation only
         Subjective, lacks automated pass/fail verification.

## TERMS

  Atomic catalog lock: File locking mechanism ensuring multiple
  processes can concurrently update catalog.json safely.
    Avoid: dead lock, race condition
  Offline resilience gate: Design pattern guaranteeing offline
  readability by keeping relative source views primary.
    Avoid: broken link, offline fail
  Falsifiable hypothesis: Quantitative criteria with strict pass/kill
  thresholds verified by automated checks.
    Avoid: vague test, loose metric
