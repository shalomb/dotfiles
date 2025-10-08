#!/bin/bash

if @has-cmd jira; then
	# https://github.com/casey/just
	source <(just --completions bash)
fi
