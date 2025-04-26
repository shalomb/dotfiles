#!/usr/bin/make -f console

MAKEFILE          := $(realpath $(lastword $(MAKEFILE_LIST)))
MAKE              := make
MAKEFLAGS         += --no-print-directory
MAKEFLAGS         += --warn-undefined-variables

.ONESHELL:
SHELL             := /bin/bash
.SHELLFLAGS       := -o errexit -o nounset -o pipefail -u -ec

# https://dustinrue.com/2021/08/parameters-in-a-makefile/
# setup arguments
RUN_ARGS          := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
# ...and turn them into do-nothing targets
$(eval $(RUN_ARGS):;@:)

GH                := $(shell which gh)
PWD               := $(shell pwd -P)
THIS_DIR          := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

.PHONY: all bundle clean dump install test update upgrade
.SILENT: all bundle clean dump install test update upgrade

deploy:
	ssh host 'mkdir -p ~/.config/brew/'
	rsync -avP "$(THIS_DIR)/" host:.config/brew/

bundle: deploy
	ssh host bash -c ' \
		cd ~/.config/brew/; \
		pwd; \
		brew bundle --file ~/.config/brew/Brewfile --upgrade --verbose; \
	'

install: bundle
update: bundle

dump:
	ssh host bash -c ' \
		brew bundle dump --global --force --describe; \
		mv ~/.Brewfile ~/.config/brew/; \
	'
	rsync -avP host:.config/brew/ "$(THIS_DIR)/"
