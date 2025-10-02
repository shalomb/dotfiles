#!/usr/bin/make -f console

MAKEFILE          := $(realpath $(lastword $(MAKEFILE_LIST)))
THIS_DIR          := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
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

.PHONY: bundle dump install upgrade
.SILENT: bundle dump install upgrade

deploy:
	ssh host 'mkdir -p ~/.config/brew/'
	scp -r "$(THIS_DIR)/" host:.config/brew/

bundle:
