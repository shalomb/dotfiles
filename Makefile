.ONESHELL:
SHELL := /bin/bash
SHELLFLAGS := -x -u nounset -ec
MAKEFILE := $(realpath $(lastword $(MAKEFILE_LIST)))

.PHONY: install
.SILENT: install

install: init submodules refresh cronjobs tmux-service  ## Init/update submodules and refresh dotfiles

.PHONY: tmux-service
tmux-service: ## Enable tmux + tmux-watch user units (needs 'make refresh' first; never restarts a running server)
	scripts/install-tmux-service.sh

init: ## Run all package installers
	# Call all other INIT scripts in this directory hierarchy
	find -L .config/ -name "INIT" -type f -exec {} \;

cronjobs: ## Install our cronjobs using gum's sensible defaults
	# Use gum's built-in crontab generation for optimal scheduling
	@{ \
	  echo "SHELL=/bin/bash"; \
	  echo "PATH=$$PATH"; \
	  echo; \
	  crontab -l | grep -v '^PATH=' | grep -v 'obsidian-auto-commit' 2>/dev/null || true; \
	  gum --crontab | grep -v '^#' | grep -v '^$$'; \
	  echo "0 11 * * * pass git push"; \
	  echo "0 */4 * * * $(HOME)/.config/dotfiles/scripts/obsidian-auto-commit.sh"; \
	  echo "0 0 * * *      sh -c '> ~/.local/state/nvim/lsp.log'" ; \
	} | awk '(/^#/ || !a[$$0]++)' \
	  | crontab -

refresh:  ## refresh all dotfiles in $HOME with versions in repo
	# Install all dotfiles into the home directory using glob patterns with cleanup
	env PYTHONPATH=src $(HOME)/.local/bin/uv run python -m dotfile_manager export --cleanup ".*" ".config/*"

.PHONY: apt apt-clean
apt: .config/apt/INIT  ## Install apt packages

apt-clean:
	# Skipping apt commands that require sudo
	# sudo apt clean
	# sudo apt autoclean
	# sudo apt autopurge
	# sudo apt autoremove
	uv cache clean --force
	find ~/.cache/ -type f -atime +182 -delete
	find ~/.config/ -iname ".mypy_cache" -exec rm -fr {} +
	find ~/.cache/act/ -atime +30 -delete 2>/dev/null || true
	# Skipping man page cleanup that requires sudo
	# bash -c 'shopt -s extglob; rm -fr /usr/share/man/!(man*|en*)'
	# sudo localepurge
	# sudo locale-gen
	# Skipping system memory cache clearing that requires sudo
	# sudo sh -c 'free && sync && swapoff -a && swapon -a && echo 3 > /proc/sys/vm/drop_caches && free'
	df -hP

.PHONY: .config/apt/INIT
.config/apt/INIT: ## Install all apt packages
	.config/apt/INIT

.PHONY: .config/submodules/INIT
.config/submodules/INIT: ## Init git submodules
	.config/submodules/INIT

.PHONY: .config/submodules/UPDATE
.config/submodules/UPDATE: ## Update all git submodules
	.config/submodules/UPDATE

.PHONY: submodules
submodules: .config/submodules/INIT .config/submodules/UPDATE

.PHONY: tools
tools: go-tools rust-tools workspace-tools bfg-tools ## Install CLI tools

.PHONY: agent-tools update-pi
agent-tools: ## Install/update coding agent harnesses (claude, copilot, codex, opencode, gemini, pi)
	.config/agent-tools/INIT

update-pi: ## Update only the pi.dev harness and its extensions
	pi update
	pi update --extensions

.PHONY: npm-tools npm-cleanup
npm-tools: ## Run npm-tools installer
	.config/npm-tools/INIT

npm-cleanup: ## Cleanup the npm cache
	npm cache clean --force
	# Destructive and relative to the invoking CWD: only run in the dotfiles repo
	if [ "$$(pwd -P)" = "$$(dirname $(MAKEFILE))" ]; then \
		rm -fr package-lock.json package.json node_modules/; \
	else \
		echo "npm-cleanup: skipping package.json/node_modules removal in $$(pwd -P)"; \
	fi
	npm cache verify

.PHONY: python-tools python-cleanup
python-tools: ## Run python-tools installer
	.config/python-tools/INIT

.PHONY: workspace-tools workspace-cleanup
workspace-tools: ## Run workspace-tools installer
	.config/installers/INIT
# Helper for cleaning specific work directories. Only regenerable caches: build/, dist/ and
# target/ are deliberately NOT swept here because some repos track them (e.g. si-proteome).
define clean_work_dir
	if [ -d "$(1)" ]; then \
		echo "Cleaning $(1)..."; \
		find "$(1)" -maxdepth 4 -type d \( -name ".terraform" -o -name "node_modules" -o -name "__pycache__" -o -name ".pytest_cache" -o -name ".mypy_cache" \) -prune -exec rm -rf {} + 2>/dev/null; \
	fi
endef

workspace-cleanup: ## Cleanup workspace-specific caches and temporary files
	set -xv
	$(call clean_work_dir,$(HOME)/oneTakeda)
	$(call clean_work_dir,$(HOME)/workspaces)
	$(call clean_work_dir,$(HOME)/shalomb)
	# Guard: the `find .` sweeps below are recursive and destructive, and they
	# run against the invoking CWD -- not this Makefile's directory. Run from
	# the wrong place (a repo with a real build/ or dist/, or worse $HOME) and
	# they take legitimate files with them. Only proceed in the dotfiles repo.
	if [ "$$(pwd -P)" != "$$(dirname $(MAKEFILE))" ]; then \
		echo "workspace-cleanup: refusing to run recursive cleanup in $$(pwd -P)"; \
		echo "  the find . sweeps only make sense in $$(dirname $(MAKEFILE))"; \
		echo "  re-run as: make -C $$(dirname $(MAKEFILE)) workspace-cleanup"; \
		exit 1; \
	fi
	# Clean Python build artifacts
	find . -name "__pycache__" -type d -exec rm -rf {} + || true
	find . -name "*.pyc" -type f -delete || true
	find . -name "*.pyo" -type f -delete || true
	find . -name ".pytest_cache" -type d -exec rm -rf {} + || true
	find . -name ".mypy_cache" -type d -exec rm -rf {} + || true
	# Clean Go build artifacts
	find . -name "*.exe" -type f -delete || true
	find . -name "*.test" -type f -delete || true
	find . -name "*.prof" -type f -delete || true
	# Clean Node.js artifacts
	find . -name "node_modules" -type d -exec rm -rf {} + || true
	find . -name "package-lock.json" -type f -delete || true
	# Clean Rust build artifacts
	find . -name "target" -type d -exec rm -rf {} + || true
	# Clean temporary files
	find . -name "*.tmp" -type f -delete || true
	find . -name "*.temp" -type f -delete || true
	find . -name "*~" -type f -delete || true
	find . -name "*.swp" -type f -delete || true
	find . -name "*.swo" -type f -delete || true
	# Clean editor backup files
	find . -name ".#*" -type f -delete || true
	find . -name "#*#" -type f -delete || true
	# Clean test artifacts
	find . -name ".coverage" -type f -delete || true
	find . -name "coverage.xml" -type f -delete || true
	find . -name "htmlcov" -type d -exec rm -rf {} + || true
	find . -name ".tox" -type d -exec rm -rf {} + || true
	# Clean documentation build artifacts
	find . -name "_build" -type d -exec rm -rf {} + || true
	find . -name "build" -type d -exec rm -rf {} + || true
	find . -name "dist" -type d -exec rm -rf {} + || true

python-cleanup: ## Cleanup the pip cache
	find ~/.cache/pip/ -atime +30 -delete 2>/dev/null || true
	find ~/.cache/pypoetry/ -atime +30 -delete 2>/dev/null || true
	# Only clean when uv is installed (the old `||` ran it only when it was missing)
	[ -x $(HOME)/.local/bin/uv ] && $(HOME)/.local/bin/uv cache clean || true

.PHONY: go-tools
go-tools: ## Run go-tools installer
	.config/go-tools/INIT

go-cleanup: ## Cleanup the gomod cache
	go clean -modcache # ~/.local/share/go
	go clean -fuzzcache
	find ~/.cache/go-*/ -atime +30 -delete || true

.PHONY: bfg-tools bfg-cleanup
bfg-tools: ## Run bfg-tools installer
	.config/bfg-tools/INIT

bfg-cleanup: ## Cleanup BFG JAR files
	rm -f ~/.local/share/bfg/bfg.jar

.PHONY: system-cleanup
system-cleanup: ## Cleanup system-wide caches and temporary files
	set -xv
	# Clean bash history and cache
	find ~/.cache/bash/ -type f -atime +30 -delete 2>/dev/null || true
	# Clean gum cache
	find ~/.cache/gum/ -type f -atime +30 -delete 2>/dev/null || true
	# Clean terraform cache (keep only latest 2 versions)
	$(HOME)/.config/dotfiles/scripts/prune-terraform-cache.sh 2
	# Clean general cache files older than 3 months
	find ~/.cache/ -type f -atime +90 -delete || true
	# Remove directory skeletons left behind by the sweep above.
	# Repeats until no empties remain, so nested husks collapse fully.
	while [ -n "$$(find ~/.cache/ -mindepth 1 -type d -empty -print -quit)" ]; do \
		find ~/.cache/ -mindepth 1 -type d -empty -delete || break; \
	done
	# Clean temporary files
	find /tmp -user $$(whoami) -type f -atime +7 -delete || true
	# Terraform leaves ~150M provider-download dirs behind; /tmp is a small tmpfs
	find /tmp -maxdepth 1 -user $$(whoami) -type d -name 'terraform-provider*' -mtime +2 -exec rm -rf {} + || true
	# Remove empty directory husks left by the file sweep above
	find /tmp -mindepth 1 -user $$(whoami) -type d -empty -mtime +7 -delete || true
	# Clean old log files
	find ~/.local/state/ -name "*.log" -type f -atime +30 -delete || true
	# Clean old backup files
	find ~/.local/state/ -name "*~" -type f -atime +30 -delete || true
	# Clean old swap files
	find ~/.local/state/ -name "*.swp" -type f -atime +7 -delete || true
	# Clean old temporary directories
	find ~/.local/state/ -type d -name "tmp*" -atime +7 -exec rm -rf {} + || true
	# Show disk usage after cleanup
	df -hP

.PHONY: rustup
rustup: ## Configure rustup
	.config/rust-tools/rustup

.PHONY: cargo
cargo: ## Configure cargo
	.config/rust-tools/cargo

.PHONY: rust-tools cargo-cleanup
rust-tools: rustup cargo ## Run rust-tools
	.config/rust-tools/INIT

cargo-cleanup: ## Cleanup the cargo cache
	cargo-cache --remove-dir all
	cargo cache -a

.PHONY: neovim-deps
neovim-deps:  ## Install neovim's dependencies
	.config/nvim/INIT

.PHONY: nvim nvim-cleanup
nvim:  neovim-deps ## Setup neovim
	# make -f .config/nvim/Makefile install
	./dotfile_stash export .config/nvim/

nvim-cleanup: ## Cleanup the nvim caches
	sh -c '> ~/.local/state/nvim/lsp.log'
	sh -c '> ~/.local/state/nvim/log'
	find ~/.cache/nvim/undo* -type f -mtime +60 -delete
	find ~/.local/state/nvim/ -type f -atime +60 -delete
	find ~/.local/state/nvim/swap/ -type f -delete
	find ~/.local/share/nvim/mason/packages/lua-language-server/libexec/log/ -iname "*.lock" -delete
	find ~/.local/share/nvim/mason/ -ipath "*mason*.lock" -delete

nvim-clear-locks: ## Cleanup nvim lock files
	find ~/.local/share/nvim/mason/ -iname "*.lock*" -delete

.PHONY: update
update:  ## Update all components
	make apt
	make submodules
	make nvim
	make tools
	make npm-tools
	make agent-tools
	make python-tools

.PHONY: clean
clean: nvim-cleanup cargo-cleanup go-cleanup apt-clean python-cleanup bfg-cleanup system-cleanup workspace-cleanup npm-cleanup local-cleanup worktree-cleanup tool-cache-cleanup

# Age-based sweeps never fire on caches that are in constant use (go-build,
# terraform plugin-cache), so those are capped by size instead.
CACHE_CAP_MB ?= 1024

.PHONY: disk-report
disk-report: ## Read-only disk usage report of the usual hot spots (needs dust)
	command -v dust >/dev/null || { echo "disk-report: dust is not installed (cargo install du-dust)"; exit 1; }
	df -hP $(HOME) | tail -n 1
	for d in $(HOME) $(HOME)/.cache $(HOME)/.local/share $(HOME)/oneTakeda $(HOME)/workspaces; do \
		[ -d "$$d" ] || continue; \
		echo; echo "== $$d"; \
		dust -P -d 1 -n 12 -x "$$d"; \
	done

.PHONY: tool-cache-cleanup
tool-cache-cleanup: ## Wipe regenerable tool caches; shrink go-build/terraform cache past CACHE_CAP_MB
	# Re-downloaded on demand by their tools
	rm -rf $(HOME)/.cache/puppeteer $(HOME)/.cache/opengrep $(HOME)/.cache/copilot
	over() { [ -d "$$1" ] && [ "$$(du -sm "$$1" | cut -f1)" -gt "$(CACHE_CAP_MB)" ]; }
	if over $(HOME)/.cache/go-build; then command -v go >/dev/null && go clean -cache; fi
	tf="$${TF_PLUGIN_CACHE_DIR:-$(HOME)/.cache/terraform.d/plugin-cache}"
	if over "$$tf"; then $(dir $(MAKEFILE))scripts/prune-terraform-cache.sh 1; fi

.PHONY: worktree-cleanup
worktree-cleanup: ## Remove git worktrees with no unique work (clean tree, HEAD pushed, unlocked)
	roots="$(wildcard $(HOME)/oneTakeda $(HOME)/workspaces $(HOME)/projects)"
	[ -z "$$roots" ] || $(dir $(MAKEFILE))scripts/prune-worktrees.sh --apply $$roots

local-cleanup: ## Cleanup .local/share and .local/lib cruft
	set -xv
	# Prune unused podman images
	command -v podman >/dev/null && podman image prune -a -f || true
	# Remove old python versions in .local/lib that are not managed by uv
	rm -rf $(HOME)/.local/lib/python3.11 $(HOME)/.local/lib/python3.12 || true
	# Remove old uv tool data
	command -v uv >/dev/null && uv python list --only-installed 2>/dev/null | awk '/\/\.local\/share\/uv\// {print $$1}' | sort -V -r | awk 'match($$0, /^(cpython-[0-9]+\.[0-9]+)/, m) {minor=m[1]; if(minor==prev){print} else {prev=minor}}' | xargs -r uv python uninstall || true
	# Keep only the 2 newest cursor-agent versions (~/.local/bin/cursor-agent links to the newest)
	ls -1 $(HOME)/.local/share/cursor-agent/versions 2>/dev/null | sort -V | head -n -2 | \
		xargs -r -I{} rm -rf "$(HOME)/.local/share/cursor-agent/versions/{}" || true
	# Clean up any remaining .local/share/go if it somehow persisted
	rm -rf $(HOME)/.local/share/go/pkg/mod/* || true
	df -hP

PI_EXT_LIB := .pi/agent/extensions/_lib

.PHONY: test-agentctl
test-agentctl: ## agentctl BDD + unit tests (SSH/GPG key availability)
	@echo "Running agentctl tests..."
	uv run pytest tests/test_agentctl_ssh_key_bdd.py tests/test_agentctl_ssh_key.py tests/test_agentctl_ssh_signing.py tests/test_agentctl_gpg_recovery.py -v --tb=short

.PHONY: test-pi
test-pi: ## Run pi extension unit tests (bun; cd needed, bun skips dot-dirs by path)
	@if ! command -v bun >/dev/null 2>&1; then \
		echo "SKIP test-pi: bun not installed"; \
	else \
		echo "Running pi extension tests..."; \
		cd $(PI_EXT_LIB) && bun test; \
	fi

.PHONY: test test-fast
test: ## Run acceptance tests (usage: make test [FAST=1])
	@echo "Running bash standards validation..."
	@tests/bash-standards/validate-standards.sh
	@echo "Running shellcheck validation..."
	@tests/bash-standards/run-shellcheck.sh
	@echo "Running bash function loading tests..."
	@tests/bash-function-loading.sh
	@$(MAKE) --no-print-directory test-pi
	@echo "Running Python tests..."
	@if [ "$(FAST)" = "1" ]; then \
		echo "Running fast tests..."; \
		uv run pytest tests/test_environment.py tests/test_dotfile_deployment.py -v --tb=short; \
	else \
		echo "Running full acceptance tests..."; \
		uv run pytest tests/test_environment.py tests/test_shell_integration.py tests/test_tmux.py tests/test_dotfile_deployment.py -v --tb=short; \
	fi

test-bash-container: ## Test bash config in OS-matched container with tmux
	@if [ -z "$$TMUX" ]; then \
		echo "? This target requires tmux. Start tmux first: tmux"; \
		exit 1; \
	fi
	@echo "?? Testing bash config in container (OS-matched)..."
	@./scripts/test-bash-in-container-tmux.sh

BASH_SUITES ?= $(addprefix tests/goss-bash-,safe.yaml contexts.yaml bootstrap.yaml functions.yaml comprehensive.yaml provenance.yaml options.yaml agents.yaml)

# Fail closed: run every suite, report each failure, exit non-zero if any failed.
# (.ONESHELL runs the recipe without -e, so status must be tracked explicitly.)
# --max-concurrent keeps parallel interactive shells from starving each other.
test-bash: ## Run all bash test suites with goss (fails if any suite fails)
	@echo "Running bash validation tests..."
	failed=""
	for suite in $(BASH_SUITES); do
		goss -g "$$suite" validate --max-concurrent 4 --format documentation || failed="$$failed $$suite"
	done
	if [ -n "$$failed" ]; then
		echo "FAILED bash suites:$$failed" >&2
		exit 1
	fi
	echo "All bash tests passed"

test-fast: ## Run fast tests only (environment + deployment)
	@echo "Running bash standards validation..."
	@tests/bash-standards/validate-standards.sh
	@echo "Running shellcheck validation..."
	@tests/bash-standards/run-shellcheck.sh
	@$(MAKE) --no-print-directory test-pi
	@echo "Running fast Python tests..."
	@uv run pytest tests/test_environment.py tests/test_dotfile_deployment.py -v --tb=short

# Application patches under .config/patches/<app>/
# Convention: each app dir exposes <app>-patch.sh with apply|status|restore.
PATCHES_DIR := .config/patches
ACTION ?= apply

.PHONY: patch
patch: ## Apply/list patches (APP=name|all [ACTION=apply|status|restore])
ifeq ($(strip $(APP)),)
	@echo "Available patches:"
	@echo "  make patch APP=<name> [ACTION=apply|status|restore]"
	@echo "  make patch APP=all    [ACTION=apply|status|restore]"
	@echo
	@found=0; \
	for dir in $(PATCHES_DIR)/*/; do \
	  [[ -d "$$dir" ]] || continue; \
	  name=$$(basename "$$dir"); \
	  script="$(PATCHES_DIR)/$$name/$$name-patch.sh"; \
	  if [[ -f "$$script" ]]; then \
	    found=1; \
	    desc=""; \
	    if [[ -f "$(PATCHES_DIR)/$$name/README.md" ]]; then \
	      desc=$$(awk 'NR==1{next} /^#|^```/{exit} NF{gsub(/:$$/,""); print; exit}' "$(PATCHES_DIR)/$$name/README.md"); \
	    fi; \
	    printf "  %-16s %s\n" "$$name" "$${desc:-$(PATCHES_DIR)/$$name/$$name-patch.sh}"; \
	  fi; \
	done; \
	if [[ "$$found" -eq 0 ]]; then \
	  echo "  (none found under $(PATCHES_DIR)/)"; \
	  exit 1; \
	fi
else ifeq ($(APP),all)
	@case "$(ACTION)" in apply|status|restore) ;; *) \
	  echo "Invalid ACTION='$(ACTION)' (expected apply|status|restore)"; exit 1 ;; esac
	@failed=0; \
	for dir in $(PATCHES_DIR)/*/; do \
	  [[ -d "$$dir" ]] || continue; \
	  name=$$(basename "$$dir"); \
	  script="$(PATCHES_DIR)/$$name/$$name-patch.sh"; \
	  [[ -f "$$script" ]] || continue; \
	  echo "==> $$name ($(ACTION))"; \
	  $(MAKE) --no-print-directory patch APP="$$name" ACTION="$(ACTION)" || failed=1; \
	done; \
	exit $$failed
else
	@case "$(ACTION)" in apply|status|restore) ;; *) \
	  echo "Invalid ACTION='$(ACTION)' (expected apply|status|restore)"; exit 1 ;; esac
	@script="$(PATCHES_DIR)/$(APP)/$(APP)-patch.sh"; \
	if [[ ! -f "$$script" ]]; then \
	  echo "Unknown patch APP='$(APP)' (expected $$script)"; \
	  echo "Run 'make patch' to list available patches."; \
	  exit 1; \
	fi; \
	chmod +x "$$script"; \
	"$$script" "$(ACTION)"
endif

.DEFAULT_GOAL := help
help: ## Show make targets available
	@ echo "Available tasks:"
	@ grep -h -E '^[a-zA-Z_\\/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s - %s\n", $$1, $$2}'

# vim: ts=2 sts=2 sw=2 noet

	./dotfile_stash export .bashrc
	./dotfile_stash export .config/bash/
	# Deploy bash configuration directory and all dependencies
	# Deploy bashrc

.PHONY: deploy
deploy:  ## Deploy bashrc and all dependencies
	./dotfile_stash export .bashrc
	./dotfile_stash export .config/bash/

.PHONY: lint
lint: ## Lint all bash and profile files with shellcheck
	@echo "Linting bash files with bash standards..."
	@find .config/bash -name "*.sh" -o -name "bashrc" | xargs shellcheck -s bash
	@echo "Linting profile files with POSIX standards..."
	@find .config/profile.d -name "*.sh" | xargs shellcheck -s sh
	@shellcheck -s sh .config/bash/profile
	@echo "? All shell files passed linting!"
