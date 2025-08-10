# make -f

.ONESHELL:
SHELL := /bin/bash
SHELLFLAGS := -x -o pipefail -uec
# MAKEFILE := $(realpath $(lastword $(MAKEFILE_LIST)))
# MAKEFLAGS         += --no-print-directory
# MAKEFLAGS         += --warn-undefined-variables

.SILENT: install
.PHONY: install
install: nvim tools

# .SILENT: nvim
.PHONY: nvim
nvim: ## Install prebuilt nvim
	@:
	set -eu -o pipefail
	echo "[$$-]"
	latest=$(shell bob ls-remote | grep --color=never -iPo 'v0.11.\d+' | head -n1)
	echo "Latest found: $$latest"
	bob install "$$latest"
	echo $$?
	ln -svf "$$HOME/.local/share/bob/$$latest/bin/nvim" "$$HOME/.local/bin/nvim"
	bob list
	nvim --headless -c ':version' -c ':echo ""' -c ':q'

.PHONY: update
update: ## update neovim components
	@:
	set -x
	# nvim --headless -c ':PackerUpdate' -c ':q'
	nvim --headless -c ':TSUpdate'     -c ':q'
	nvim --headless -c ':TSUpdateSync' -c ':q'
	# These following commands do not seem to be invocable from CLI
	nvim --headless -c ':Lazy update'  -c ':q'
	nvim --headless -c ':Lazy profile'  -c ':q'
	nvim --headless -c ':version' -c ':q'
	# See ~/.local/state/nvim/mason.log
	nvim --headless -c ':MasonUpdate'  -c ':q'
	nvim --headless -c ':MasonToolsInstallSync'  -c ':q'
	nvim --headless -c ':MasonToolsUpdateSync'  -c ':q'

.PHONY: aux
aux: ex vimdiff view rvim rview

.PHONY: all
all: install aux test clean

# https://tracker.debian.org/pkg/neovim
.PHONY: deps
deps: ## install the OS dependencies
	sudo sudo apt build-dep -yyq neovim -t unstable
	sudo apt install -yyq build-essential git libuv1-dev libnsl-dev libtool libtool-bin \
		devscripts python3-neovim python3-pynvim ninja-build gettext cmake unzip curl build-essential \
		libvterm-dev build-essential fakeroot devscripts

.PHONY: build-env
build-env: deps  ## setup the build dependencies
	mkdir -p ~/build/neovim/
	cd ~/build/neovim
	if ! git rev-parse --is-inside-work-tree; then
		git clone https://github.com/neovim/neovim.git
	fi

.SILENT: test
.PHONY: test
test:  ## test the nvim installtion
	set -v
	tmpfile=$$(mktemp /tmp/nvim-health.log.XXXXXX)
	trap "rm $$tmpfile || true" INT EXIT

	nvim --headless -c ':version' -c ':echo ""' -c ':q'
	nvim --headless -c ':checkpath' -c ':echo ""' -c ':q'
	echo

	echo "Checking lua files in ~/.config/nvim/lua"
	for i in $(shell find ~/.config/nvim/lua -name '*.lua'); do
		echo "Checking syntax of $$i"
		nvim --headless -c ":luafile $$i" -c ':echo ""' -c ':q'
	done
	echo

	echo "Checking health of nvim components"
	for component in lazy vim.lsp vim.treesitter nvim-treesitter null-ls telescope vim.health vim.provider; do
		echo "Checking health of $$component"
		nvim --headless "+checkhealth $$component" "+w!$$tmpfile" "+echo" +qa 2>/dev/null
		if grep -E 'WARNING|ERROR' "$$tmpfile"; then
			echo "Warnings or errors found in healthcheck $$component!"
			exit 1
		fi
	done
	echo ""

	for component in vim.deprecated; do
		echo "Checking deprecations via $$component"
		nvim --headless "+checkhealth $$component" "+w!$$tmpfile" "+echo" +qa 2>/dev/null
		grep -E 'WARNING' "$$tmpfile"
		if grep -E 'ERROR' "$$tmpfile"; then
			echo "Warnings or errors found in healthcheck $$component!"
		fi
	done

# https://github.com/neovim/neovim/wiki/Installing-Neovim#install-from-source
# https://gist.github.com/shalomb/c20478247be553c45ed94b90583b5c41
.SILENT: nvim-from-source
.PHONY: nvim-from-source
nvim-from-source: build-env ## Run all package installers
	cd ~/build/neovim
	git checkout .
	git checkout master
	git fetch --all
	tag=$$(git describe --tags --abbrev=0)  # last tag e.g. nightly
	tag=$$(git describe --tags $$(git rev-list --tags --max-count=1) --match 'v0.1[0-9]*.[0-9]*')  # Last annotated tags
	tag='v0.11.3' # 'v0.9.5'
	echo ----------------------------
	echo "Checking out tag: $$tag"
	echo ----------------------------
	git checkout "$$tag"
	git pull --rebase origin "$$tag"
	make CMAKE_BUILD_TYPE=RelWithDebInfo \
				CMAKE_EXTRA_FLAGS="-DCMAKE_INSTALL_PREFIX=$$HOME/.local"
	make install
	nvim -c ':version'

.SILENT: nvim-from-source
.PHONY: nvim-from-source
build: nvim-from-source  ## build nvim
	@:

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

.PHONY: profile
profile: ## profile neovim startup
	@:
	set -x
	nvim --startuptime $$TMP/neovim.startuptime /etc/services +qa; nvim $$TMP/neovim.startuptime; rm -v $$TMP/neovim.startuptime;

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
