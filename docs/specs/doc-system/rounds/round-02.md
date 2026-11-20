# GRILL ROUND 2 -- topic: /doc system: scratch and search details
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [scratch.cli] -- Which commands does scratch have in slice 1?

CONTEXT:
  Slice 1 needs a way to open, list and print a note.
  todo-navigator is the model: a CLI plus a slash command.

OPTIONS:
  [x] A. scratch [name] / list / path  (RECOMMENDED)
         Small. Open editor, list notes, print path.
  [ ] B. Add rm, mv, append
         More useful. More surface to test.

## Q2 [scratch.agent_access] -- How does an agent find the current note?

CONTEXT:
  Agents cannot guess the repo slug and worktree key.
  A fixed path rule lets them read notes with the read tool.

OPTIONS:
  [x] A. `scratch path` prints the note path  (RECOMMENDED)
         Deterministic. No new tool. Agent runs one command.
  [ ] B. Dedicated pi tool
         Nicer for agents. More code in the extension.

## Q3 [scratch.promote] -- Does scratch promote ship in slice 1?

CONTEXT:
  Promotion turns a scratch note into a /doc document.
  Slice 1 aims at the capture loop and search UX.

OPTIONS:
  [x] A. Defer to slice 2  (RECOMMENDED)
         Keeps slice 1 small.
  [ ] B. Ship in slice 1
         Closes the loop. Needs title, kind and render choices.

## Q4 [scratch.undo] -- Does scratch force persistent undo?

CONTEXT:
  The store is a normal path, so undofile works if enabled.
  The user's nvim config may already set undodir.

OPTIONS:
  [x] A. No enforcement. Document it.  (RECOMMENDED)
         Zero code. Relies on user config.
  [ ] B. Set undofile when opening
         Guaranteed. Passes editor flags that can surprise.

## Q5 [search.legend] -- How does the legend fold?

CONTEXT:
  The legend lists kinds, tags and key hints such as /.
  On a non-empty query it must fold into a recoverable control.

OPTIONS:
  [x] A. Fold into a details pill  (RECOMMENDED)
         Recoverable. Works with no JS state.
  [ ] B. Hide until query clears
         Cleaner. Guidance is not reachable while searching.

## Q6 [search.index_seam] -- Does the page change the index.json contract?

CONTEXT:
  index.json is the API seam. The page already reads cards from it.
  A later doc CLI will use the same seam.

OPTIONS:
  [x] A. Page uses index.json only  (RECOMMENDED)
         One seam. No new data.
  [ ] B. Add search fields to index.json
         Better matching. Changes the seam early.

## TERMS

  Scratch store: The directory
  ~/.cache/agent-skills/scratch/<repo-slug>/ that holds all notes of one
  repo.
    Avoid: scratch dir
  Landing state: Search page state with a centred search box and a
  visible legend.
    Avoid: idle mode
  Docked state: Search page state after a non-empty query: the box
  sticks to the top and the legend folds.
    Avoid: active mode
