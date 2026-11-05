# GRILL ROUND 3 -- topic: /goal drafting UX
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## REVIEW

  DECISION TREE -- /goal drafting UX (TB-7c), stance mid-execution

  goalux
    stance ........... mid-execution; ADR-008/009/010 unchanged
    discover ......... Discovery before every draft: already true /
                       partly true / not there                [ADR-011]
      waf.discover-false-claim  each claim cites path + command
    clarify .......... at most 2 questions, only on a gap      [ADR-011]
    cross-repo ....... goal moves to the Owning Repo           [ADR-011]
    draft-lint ....... at save, warn only; lock still enforces
      waf.lint-runs-commands    static only; no draft command
                                runs before review
      waf.lint-fatigue          4 rules: missing command/script,
                                anchor outside repo, anchor in
                                install dir, shared branch
    shared-branch .... warn and offer a worktree
    review-card ...... fixed card from the extension; ends with
                       one next-step line
    noise ............ one quiet line; injected prompt hidden
    retest ........... replay g-develop and --version, 4 pass rules
      waf.kill-rule             both replays fail >=2 rules ->
                                remove Discovery, keep card + lint

  ARTEFACTS
    adr/ADR-011-discovery-before-goal-draft.md       (new)
    features/goal-contract.feature                   (+2 rules, 7 scenarios)
    GLOSSARY.md        Discovery, Draft Lint, Review Card, Owning Repo
    decision-tree.md   section "/goal drafting UX (TB-7c)"
    rounds/goal-ux/round-01.md, round-02.md

  DRAFT HANDOFF -- TB-7c (build lane)
    1. Draft prompt: Discovery block + <=2 gap questions before
       goal_propose; quiet one-line notice.
    2. goal_propose: optional discovery {status, claims[{path,command}]}.
    3. Draft Lint (pure, static): 4 rules, warnings only.
    4. Review Card rendered by the extension after every draft save.
    5. /goal on default or shared branch: warn, offer a worktree.
    6. Replay g-develop and --version; apply the kill rule; record it.
    Not in scope: cross-repo goals; running checks at save.
