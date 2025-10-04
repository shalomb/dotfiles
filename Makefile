.ONESHELL:
SHELL := /bin/bash
SHELLFLAGS := -x -u nounset -ec
MAKEFILE := $(realpath $(lastword $(MAKEFILE_LIST)))

.PHONY: install
.SILENT: install

install: init submodules refresh cronjobs  ## Init/update submodules and refresh dotfiles

init: ## Run all package installers
	# Call all other INIT scripts in this directory hierarchy
	find -L .config/ -name "INIT" -type f -exec {} \;

cronjobs: ## Install our cronjobs using gum's sensible defaults
	# Use gum's built-in crontab generation for optimal scheduling
	@{ \
	  echo "SHELL=/bin/bash"; \
	  echo "PATH=$$PATH"; \
	  echo; \
	  crontab -l | grep -v '^PATH=' 2>/dev/null || true; \
	  gum --crontab | grep -v '^#' | grep -v '^$$'; \
	  echo "0 0 * * *      sh -c '> ~/.local/state/nvim/lsp.log'" ; \
	} | awk '(/^#/ || !a[$$0]++)' \
	  | crontab -

refresh:  ## refresh all dotfiles in $HOME with versions in repo
	# Install all dotfiles into the home directory
	find .* \
	  \( -name ".git" -o -name "INIT" -o -name "*.sw?" -o -name "*~" \) -prune \
	  -o -type f -exec env PYTHONPATH=src $(HOME)/.local/bin/uv run python -m dotfile_manager export {} +
	# Clean up orphaned files that are no longer tracked
	find .* \
	  \( -name ".git" -o -name "INIT" -o -name "*.sw?" -o -name "*~" \) -prune \
	  -o -type d -exec env PYTHONPATH=src $(HOME)/.local/bin/uv run python -m dotfile_manager cleanup {} \;

.PHONY: apt apt-clean
apt: .config/apt/INIT  ## Install apt packages

apt-clean:
	sudo apt clean
	sudo apt autoclean
	sudo apt autopurge
	sudo apt autoremove
	uv cache clean
	find ~/.cache/ -type f -atime +182 -delete
	find ~/.config/ -iname ".mypy_cache" -exec rm -fr {} +
	find ~/.cache/act/ -atime +30 -delete
	bash -c 'shopt -s extglob; rm -fr /usr/share/man/!(man*|en*)'
	sudo localepurge
	sudo locale-gen
	sudo sh -c 'free && sync && swapoff -a && swapon -a && echo 3 > /proc/sys/vm/drop_caches && free'
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

.PHONY: npm-tools npm-cleanup
npm-tools: ## Run npm-tools installer
	.config/npm-tools/INIT

npm-cleanup: ## Cleanup the npm cache
	npm cache clean --force
	rm -fr package-lock.json package.json node_modules/
	npm cache verify

.PHONY: python-tools python-cleanup
python-tools: ## Run python-tools installer
	.config/python-tools/INIT

.PHONY: workspace-tools workspace-cleanup
workspace-tools: ## Run workspace-tools installer
	.config/installers/INIT

python-cleanup: ## Cleanup the pip cache
	find ~/.cache/pip/ ~/.cache/pypoetry/ -atime +30 -delete || true
	command -v $(HOME)/.local/bin/uv || $(HOME)/.local/bin/uv cache clean

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
	find ~/.cache/terraform.d/plugin-cache/ -depth -type f -mtime +30 -print -delete

nvim-clear-locks: ## Cleanup nvim lock files
	find ~/.local/share/nvim/mason/ -iname "*.lock*" -delete

.PHONY: update
update:  ## Update all components
	make apt
	make submodules
	make nvim
	make tools
	make npm-tools
	make python-tools

.PHONY: clean
clean: nvim-cleanup cargo-cleanup go-cleanup npm-cleanup apt-clean python-cleanup bfg-cleanup

.PHONY: test test-fast
test: ## Run acceptance tests (usage: make test [FAST=1])
	@if [ "$(FAST)" = "1" ]; then \
		echo "Running fast tests..."; \
		uv run pytest tests/test_environment.py tests/test_dotfile_deployment.py -v; \
	else \
		echo "Running full acceptance tests..."; \
		uv run pytest tests/test_environment.py tests/test_shell_integration.py tests/test_tmux.py tests/test_dotfile_deployment.py -v; \
	fi

test-fast: ## Run fast tests only (environment + deployment)
	@uv run pytest tests/test_environment.py tests/test_dotfile_deployment.py -v

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
	@echo "✅ All shell files passed linting!"
