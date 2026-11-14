# GRILL ROUND 1 -- topic: /doc system evolution: search UX and shadow scratch
# STANCE: long horizon. The current code is evidence, not authority.
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
  /doc is new capability, so the code is evidence, not authority.
  Library code: profiles/personal/extensions/_lib/doc-library.ts and
  doc-render/.

OPTIONS:
  [x] A. Long horizon  (RECOMMENDED)
         Challenge scar tissue. Change code if needed.
  [ ] B. Mid-execution
         Keep code and ADRs as the base. Faster, less freedom.

## Q2 [scope.first_slice] -- Which slice do we build first?

CONTEXT:
  The vision has 10 parts. One slice must prove the design.
  Both slices extend the existing index.json seam.

OPTIONS:
  [x] A. Search UX + shadow scratch  (RECOMMENDED)
         Two small, independent, visible wins.
  [ ] B. Full CLI + navigator skill
         Larger. Agents gain most value.
  [ ] C. Dossier + meta-doc engine
         Biggest scope. Highest risk first.

## Q3 [scratch.storage_path] -- Where does the scratch store live?

CONTEXT:
  It must survive reboots and tmpfiles sweeps. It must not dirty git.
  todo-navigator already uses ~/.cache/agent-skills/<repo-slug>/.

OPTIONS:
  [x] A. XDG cache, per repo slug  (RECOMMENDED)
         Matches todo-navigator. Cache may be wiped by cleaners.
  [ ] B. XDG state, per repo and branch
         Durable by convention. New path pattern.
  [ ] C. In-repo, git-excluded
         Visible in the tree. Lost with the worktree.

## Q4 [scratch.key] -- What keys a scratch note inside the store?

CONTEXT:
  Worktrees share a repo slug but have different branches.
  Branches can be renamed or deleted.

OPTIONS:
  [x] A. Repo slug / worktree name  (RECOMMENDED)
         Stable across branch renames.
  [ ] B. Repo slug / branch
         Follows the work. Breaks on rename.
  [ ] C. Repo slug only
         Simple. Notes of parallel worktrees mix.

## Q5 [search.ui_transition] -- How does the search page change on typing?

CONTEXT:
  Idle: centred search plus legend. Active: docked bar plus card grid.
  index.html is static HTML with inline JS.

OPTIONS:
  [x] A. CSS state toggle  (RECOMMENDED)
         One page. A class on non-empty query. Esc resets.
  [ ] B. Two page modes
         More code. Easier to test each mode.

## TERMS

  Shadow scratch: A note file kept outside the git tree, tied to a repo
  and worktree.
    Avoid: temp note, tmp file
  Document library: The doc root that holds filed documents and
  index.json.
    Avoid: doc store
