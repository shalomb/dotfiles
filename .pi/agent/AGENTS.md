# Global Instructions

- Always apply the `modern-cli-overrides` skill: use modern CLI tool replacements
  (rg, fd, sg/ast-grep, jq/yq, httpie) instead of grep/find/curl/sed/awk whenever
  available, before running any shell command that would otherwise use the
  traditional tool.
- Always apply the `git-commit-formatter` skill (ACP: Atomic Commit Protocol,
  Conventional Commits) when forming any git commit.
- For any coding or development work, load and apply the `test-driven-development`
  and `farley-tdd` skills. Always establish proof that what you build is correct,
  using the strongest option that fits: a failing test first; otherwise a
  characterisation test, a spike followed by a test, or executable verification
  (validate/plan/dry-run). If none applies, say why and what check replaces it.
  Never claim work is done without running that proof
  (see `verification-before-completion`). During the loop prefer the repo's fast
  test target (e.g. `make test-unit`, `just test-fast`); do not run the full
  suite on every edit.
- Never bypass commit hooks (`--no-verify`, `SKIP=`, `HUSKY=0`, `core.hooksPath`
  overrides). If a hook fails, fix the cause; if a hook seems wrong, ask the user.
  Do not add hook or tooling files to shared repos to set up quality gates.
