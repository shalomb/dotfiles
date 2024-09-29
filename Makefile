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
	# m h  dom mon dow   command
	@{ \
	  echo "SHELL=/bin/bash"; \
	  echo "PATH=$$PATH"; \
	  echo; \
	  crontab -l | grep -v '^PATH='; \
	  echo "*/1  * * * *   cwds-list -u"     2>/dev/null; \
	  echo "*/30 * * * *   projects-list -u" 2>/dev/null;  \
		echo "0 0 * * *      sh -c '> ~/.local/state/nvim/lsp.log'" ; \
	} | awk '(/^#/ || !a[$$0]++)' \
	  | crontab -

refresh:  ## refresh all dotfiles in $HOME with versions in repo
	# Install all dotfiles into the home directory
	find .* \
	  \( -name ".git" -o -name "INIT" -o -name "*.sw?" -o -name "*~" \) -prune \
	  -o -type f -exec ./dotfile_stash export {} +

.PHONY: apt apt-clean
apt: .config/apt/INIT  ## Install apt packages

apt-clean:
	sudo apt clean
	sudo apt autoclean
	sudo apt autopurge
	sudo apt autoremove
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
tools: go-tools rust-tools workspace-tools ## Install CLI tools

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

python-cleanup: ## Cleanup the pip cache
	pip cache dir
	pip cache info
	pip cache list
	pip cache purge
	pip cache remove '*'
	pip cache info
	find ~/.cache/pypoetry/ -atime +30 -delete

.PHONY: go-tools
go-tools: ## Run go-tools installer
	.config/go-tools/INIT

go-cleanup: ## Cleanup the gomod cache
	go clean -modcache # ~/.local/share/go
	go clean -fuzzcache

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
	make -f .config/nvim/Makefile install

nvim-cleanup: ## Cleanup the nvim caches
	make -f .config/nvim/Makefile clean
	find ~/.cache/nvim/undo* -type f -mtime +60 -delete
	find ~/.local/state/nvim/ -type f -atime +60 -delete
	find ~/.local/state/nvim/swap/ -type f -delete
	find ~/.local/share/nvim/mason/packages/lua-language-server/libexec/log/ -iname "*.lock" -delete
	find ~/.local/share/nvim/mason/ -ipath "*mason*.lock" -delete
	sh -c '> ~/.local/state/nvim/lsp.log'

.PHONY: update
update:  ## Update all components
	make apt
	make submodules
	make nvim
	make tools
	make npm-tools
	make python-tools

clean: cargo-cleanup go-cleanup neovim-cleanup npm-cleanup python-cleanup apt-cleanup

.DEFAULT_GOAL := help
help: ## Show make targets available
	@ echo "Available tasks:"
	@ grep -h -E '^[a-zA-Z_\\/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s - %s\n", $$1, $$2}'

# vim: ts=2 sw=2 noet
