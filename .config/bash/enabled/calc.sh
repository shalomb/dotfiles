#!/bin/bash

calc() {
  echo >&2 "Using eva(1) instead of $(type -P calc)"
  eva -f2 "$@"
}
