.ONESHELL:
SHELL := /bin/bash
SHELLFLAGS := -x -u nounset -ec
MAKEFILE := $(realpath $(lastword $(MAKEFILE_LIST)))

.PHONY: install
.SILENT: install

install: init submodules refresh  ## Init/update submodules and refresh dotfiles

init: ## Run all package installers
	# Call all other INIT scripts in this directory hierarchy
	find -L .config/ -name "INIT" -type f -exec {} \;

refresh:  ## refresh all dotfiles in $HOME with versions in repo
	# Install all dotfiles into the home directory
	find .* \
	  \( -name ".git" -o -name "INIT" -o -name "*.sw?" -o -name "*~" \) -prune \
	  -o -type f -exec ./dotfile_stash export {} +

.PHONY: .config/apt/INIT
.config/apt/INIT: ## Install all apt packages
	.config/apt/INIT

.PHONY: .config/submodules/UPDATE
.config/submodules/UPDATE: ## Update all git submodules
	.config/submodules/UPDATE

.PHONY: submodules
submodules: .config/submodules/UPDATE

.PHONY: .config/vim/INIT
.config/vim/INIT: ## Run vim installer
	.config/vim/INIT

.PHONY: go-tools
go-tools: ## Run go-tools installer
	.config/bash/rc.d/go-tools

.PHONY: .config/workspace-tools/INIT
.config/workspace-tools/INIT: ## Run workspace-tools installer
	.config/workspace-tools/INIT

.DEFAULT_GOAL := help
help: ## Show make targets available
	@ echo "Available tasks:"
	@ grep -h -E '^[a-zA-Z_\\/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s - %s\n", $$1, $$2}'

# vim: ts=2 sw=2 et
