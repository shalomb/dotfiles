# GRILL ROUND 1 -- topic: pi-find UX: recall, widening search, fzf, pi-profile
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [stance] -- How much must the current pi-find code constrain the design?

CONTEXT:
  pi-find is a small CLI. Search is SQL LIKE on one digest column.
  This is new capability, not a fix inside a settled design.

OPTIONS:
  [x] A. Long horizon: code is evidence  (RECOMMENDED)
         Free to change registry search and schema.
  [ ] B. Mid-execution: code is foundation
         Keep LIKE search. Add only a front end.

## Q2 [ladder.trigger] -- When must pi-find widen the search to the next scope?

CONTEXT:
  Scopes: cwd, repo with worktrees, sibling repos, home, whole registry.
  /locate ranks all scopes together with a zone weight.

OPTIONS:
  [x] A. Rank all scopes by weight  (RECOMMENDED)
         One list. Near results rank first. Same as /locate.
  [ ] B. Widen only when a scope is empty
         Cleaner list. A weak near hit hides a strong far hit.
  [ ] C. Widen on a key press in fzf
         User controls. Costs one extra step.

DIAGRAM:
  cwd(1.0) > repo(0.9) > parent(0.75) > home(0.5) > all(0.25)
  score = term match x zone weight

## Q3 [expand.source] -- Where must term expansion get related words?

CONTEXT:
  The user can misremember a term.
  Registry holds digests, branch names, worktree names and repo names.

OPTIONS:
  [x] A. Local vocabulary and fuzzy match  (RECOMMENDED)
         Fast, free, and repeatable. No LLM call.
  [ ] B. Local first, LLM rewrite as last step
         Finds more. Costs tokens and time.
  [ ] C. Exact and OR match only
         Simplest. Does not fix a wrong term.

## Q4 [search.engine] -- Which engine must rank the matches?

CONTEXT:
  Today every word must match (AND). One wrong word gives zero rows.
  SQLite supports FTS5 with ranking and prefix match.

OPTIONS:
  [x] A. SQLite FTS5 plus trigram fuzzy  (RECOMMENDED)
         Ranking and typo help. Needs index build and migration.
  [ ] B. Keep LIKE, score in code
         No schema change. Slow on large history.

## Q5 [ui.fzf] -- What must pi-find do on a terminal with no --json?

CONTEXT:
  Today it prints a table and a /resume line.
  Piped output must stay stable for scripts.

OPTIONS:
  [x] A. Open fzf with preview; pipe gives table  (RECOMMENDED)
         Fast pick. Needs fzf. Scripts keep working.
  [ ] B. Always print table; add --pick flag
         No surprise. User must ask for fzf.

## Q6 [profile.scope] -- Which pi-profile sessions must pi-find search by default?

>> I think pi-find find's all pi sessions (not just those started by
    >> pi-profile)

CONTEXT:
  Sessions root is fixed to the personal profile today.
  The resume command needs the right profile.

OPTIONS:
  [x] A. All profiles, with a profile column  (RECOMMENDED)
         Finds the session wherever it was. Longer list.
  [ ] B. Current profile only; --all-profiles flag
         Short list. Misses sessions in other profiles.

## Q7 [resume.action] -- What must Enter do on a selected session?

CONTEXT:
  A session has a cwd, a profile and an id.

OPTIONS:
  [x] A. cd to cwd, resume in the right profile  (RECOMMENDED)
         One step. Changes the shell directory.
  [ ] B. Print the resume command only
         Safe. User must run it.

I want to say `pi-find` or even `pi-profile`, for that matter, should really be working within a work tree. The objective is just to `cd` into where the session would have been. The goal really is to make sure that we're not really starting sessions in the top level of the repository but in a work tree within the target repository.

## TERMS

  Scope: A level of the search ladder: cwd, repo, parent, home,
  registry.
    Avoid: zone, ring, tier
  Widening: Search in the next scope when the near scope gives few
  matches.
  Term expansion: Add related words to the user's term before the
  search.
