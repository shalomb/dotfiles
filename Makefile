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

cronjobs: ## Install our cronjobs
	@{ \
	  echo "SHELL=/bin/bash"; \
	  echo "PATH=$$PATH"; \
	  echo; \
	  crontab -l | grep -v '^PATH='; \
	  echo "*/1  * * * *   cwds-list -u"     &>/dev/null; \
	  echo "*/30 * * * *   projects-list -u" &>/dev/null;  \
	} | awk '(/^#/ || !a[$$0]++)' \
	  | crontab -

refresh:  ## refresh all dotfiles in $HOME with versions in repo
	# Install all dotfiles into the home directory
	find .* \
	  \( -name ".git" -o -name "INIT" -o -name "*.sw?" -o -name "*~" \) -prune \
	  -o -type f -exec ./dotfile_stash export {} +

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
tools: go-tools rust-tools workspace-tools ## Install CLI tools

.PHONY: python-tools
python-tools: ## Run python-tools installer
	.config/python-tools/INIT

.PHONY: go-tools
go-tools: ## Run go-tools installer
	.config/go-tools/INIT

.PHONY: rust-tools
rust-tools: ## Run rust-tools
	.config/rust-tools/INIT

.PHONY: nvim
nvim:  ## Setup neovim
	make -f .config/nvim/Makefile install

.PHONY: .config/vim/INIT
.config/vim/INIT: ## Run vim installer
	.config/vim/INIT

.DEFAULT_GOAL := help
help: ## Show make targets available
	@ echo "Available tasks:"
	@ grep -h -E '^[a-zA-Z_\\/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s - %s\n", $$1, $$2}'

# vim: ts=2 sw=2 et
