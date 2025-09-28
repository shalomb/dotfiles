#!/bin/bash

for sourceable in ~/workspace/aliases/*.sh; do
  source "$sourceable"
done
