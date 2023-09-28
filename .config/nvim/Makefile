# make -f

.ONESHELL:
SHELL := /bin/bash
SHELLFLAGS := -x -u nounset -ec
MAKEFILE := $(realpath $(lastword $(MAKEFILE_LIST)))

.SILENT: install
.PHONY: install
install: nvim packer tools

.PHONY: aux
aux: ex vimdiff view rvim rview

.PHONY: all
all: install aux test clean

.PHONY: clean
clean:

.PHONY: test
test:

.PHONY: deps
deps: ## install the OS dependencies
	sudo sudo apt build-dep -yyq neovim -t unstable
	sudo apt install -yyq build-essential git libtool libtool-bin devscripts \
		python3-neovim python3-pynvim

.PHONY: build-env
build-env: deps  ## setup the build dependencies
	mkdir -p ~/build/neovim/
	cd ~/build/neovim
	if ! git rev-parse --is-inside-work-tree; then
		git clone https://github.com/neovim/neovim.git
	fi

# https://github.com/neovim/neovim/wiki/Installing-Neovim#install-from-source
# https://gist.github.com/shalomb/c20478247be553c45ed94b90583b5c41
.SILENT: nvim
.PHONY: nvim
nvim: build-env ## Run all package installers
	cd ~/build/neovim
	git checkout .
	git checkout master
	git fetch --all
	tag=$$(git describe --tags --abbrev=0)  # last tag e.g. nightly
	tag=$$(git describe --tags $$(git rev-list --tags --max-count=1) --match 'v0.9.[0-9]*')  # Last annotated tag on the v0.9.* series
	echo ----------------------------
	echo "Checking out tag: $$tag"
	echo ----------------------------
	git checkout "$$tag"
	git pull --rebase origin "$$tag"
	make CMAKE_BUILD_TYPE=RelWithDebInfo \
				CMAKE_EXTRA_FLAGS="-DCMAKE_INSTALL_PREFIX=$$HOME/.local"
	make install
	nvim -c ':version'

.PHONY: packer
packer: ## configure packer
	packer_dir="$$HOME/.local/share/nvim/site/pack/packer/start/packer.nvim"
	mkdir -p "$$packer_dir"
	( set -xv &&
		cd "$$packer_dir" &&
		if ! git rev-parse --is-inside-work-tree; then
			git clone https://github.com/wbthomason/packer.nvim . || true
		fi
	)
	nvim --headless -c 'autocmd User PackerComplete quitall' -c 'PackerSync'

.SILENT: test
.PHONY: test
test:  ## test the nvim installtion
	nvim --headless -c ':checkhealth'
	nvim --headless -c ':version'

ex: ## install ex
	echo 'command nvim -e "$@"' > ~/.local/bin/ex
	chmod +x ~/.local/bin/ex
	hash -r

vimdiff: ## install vimdiff
	echo 'command nvim -d "$@"' > ~/.local/bin/vimdiff
	chmod +x ~/.local/bin/vimdiff
	hash -r

view: ## install view
	echo 'command nvim -R "$@"' > ~/.local/bin/view
	chmod +x ~/.local/bin/view
	hash -r

rvim: ## install rvim
	echo 'command nvim -Z "$@"' > ~/.local/bin/rvim
	chmod +x ~/.local/bin/rvim
	hash -r

rview: ## install rview
	echo 'command nvim -RZ "$@"' > ~/.local/bin/rview
	chmod +x ~/.local/bin/rview
	hash -r

.PHONY: update
update:  ## update neovim components
	@:
	set -x
	nvim --headless -c ':PackerUpdate' -c ':q'
	nvim --headless -c ':TSUpdate'     -c ':q'
	nvim --headless -c ':TSUpdateSync' -c ':q'
	nvim --headless -c ':MasonUpdate'  -c ':q'

.PHONY: tools
tools:  ## install tools / prereqs
	sudo apt install -yqq shellcheck shfmt ansible-lint pylint
	cd ~/.config/dotfiles && make go-tools
	hash -r

.PHONY: clean
clean:  ## clean the neovim build cache
	cd ~/build/neovim/
	make clean

.DEFAULT_GOAL := help
help: ## Show make targets available
	@ echo "Available tasks:"
	@ grep -h -E '^[a-zA-Z_\\/.-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s - %s\n", $$1, $$2}'

# vim:ft=make noet nolist
