# GRILL ROUND 3 -- topic: /doc system: adversarial stress-test (waf)
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [waf.cost-overhead-cap] -- How do we keep search and scratch cheap?

CONTEXT:
  Search runs on each keystroke over all cards in the page.
  Scratch commands run in a shell on every call.

OPTIONS:
  [x] A. Pure client filter, no LLM, no network  (RECOMMENDED)
         Instant. Kill if filter > 50 ms at 2000 cards.
  [ ] B. Add server-side search
         Scales further. Needs a running server.

## Q2 [waf.concurrency] -- How do we handle two writers on one note?

CONTEXT:
  Two worktrees can open the same scratch note.
  Two agents can append at the same time.

OPTIONS:
  [x] A. Key by worktree, append with O_APPEND, no locks  (RECOMMENDED)
         Simple. Editor overwrite can still lose an append.
  [ ] B. Lock file per note
         Safe. Stale locks after a crash.

## Q3 [waf.partial-salvage] -- What happens to notes when a worktree goes away?

CONTEXT:
  A worktree can be deleted or renamed.
  The cache path can be wiped by a cleaner.

OPTIONS:
  [x] A. Notes stay under the old key; list shows orphans  (RECOMMENDED)
         Nothing is lost. Orphans need manual cleanup.
  [ ] B. Auto-move notes on rename
         Tidy. Needs git hooks or polling.

## Q4 [waf.cold-start] -- Does the design work with zero documents and no remote?

CONTEXT:
  A new user has 0 documents. A power user has 2000.
  A repo can have no remote, so no clear slug.

OPTIONS:
  [x] A. Empty-state text; slug falls back to the directory name  (RECOMMENDED)
         Works at N=0 and N=1. Slug clashes are possible.
  [ ] B. Require a remote to name the slug
         Unique slugs. Fails for local-only repos.

## Q5 [waf.falsifiable-hypotheses] -- Do we accept these hypotheses and kill thresholds?

CONTEXT:
  Each pillar needs a number and a spike.
  H1 docked search stays usable. H2 notes survive a reboot. H3 git
  status stays clean.

OPTIONS:
  [x] A. Accept H1-H3 with these thresholds  (RECOMMENDED)
         H1: filter < 50 ms at 2000 cards. H2: note present after cache
         survives reboot. H3: git status empty after 10 scratch edits.
  [ ] B. Change the thresholds
         Write new numbers in a note.
