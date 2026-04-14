#!/bin/bash
# Prune Terraform provider cache to keep only the N latest versions per provider
KEEP=${1:-2}
CACHE_DIR="$HOME/.cache/terraform.d/plugin-cache/registry.terraform.io"

if [ ! -d "$CACHE_DIR" ]; then
    echo "Terraform cache directory not found: $CACHE_DIR"
    exit 0
fi

# Find all provider directories (e.g., hashicorp/aws)
find "$CACHE_DIR" -mindepth 2 -maxdepth 2 -type d | while read -r provider; do
    echo "Processing provider: $(basename "$(dirname "$provider")")/$(basename "$provider")"
    
    # List versions, sort them by version number (descending), and skip the first N
    # We use 'ls -1v' for version sorting if available, or just sort -V
    versions=$(ls -1 "$provider" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V -r)
    
    count=0
    while read -r version; do
        if [ -z "$version" ]; then continue; fi
        count=$((count + 1))
        if [ $count -gt "$KEEP" ]; then
            echo "  Removing old version: $version"
            rm -rf "${provider:?}/${version}"
        else
            echo "  Keeping version: $version"
        fi
    done <<< "$versions"
done
