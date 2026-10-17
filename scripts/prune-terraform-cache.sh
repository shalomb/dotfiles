#!/bin/bash
# Prune Terraform provider caches to keep only the N latest stable versions per provider.
# Covers every registry directory (registry.terraform.io, tf.app.wiz.io, ...) under each
# cache root: the active one ($TF_PLUGIN_CACHE_DIR) and the legacy ~/.terraform.d one.
KEEP=${1:-2}
ROOTS=("${TF_PLUGIN_CACHE_DIR:-$HOME/.cache/terraform.d/plugin-cache}" "$HOME/.terraform.d/plugin-cache")

declare -A seen
for root in "${ROOTS[@]}"; do
    [[ -d $root && -z ${seen[$root]:-} ]] || continue
    seen[$root]=1

    # <root>/<registry>/<namespace>/<type>/<version>
    find "$root" -mindepth 3 -maxdepth 3 -type d | while read -r provider; do
        echo "Processing provider: ${provider#"$root"/}"

        count=0
        while read -r version; do
            [ -z "$version" ] && continue
            count=$((count + 1))
            if [ $count -gt "$KEEP" ]; then
                echo "  Removing old version: $version"
                rm -rf "${provider:?}/${version}"
            else
                echo "  Keeping version: $version"
            fi
        done < <(find "$provider" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V -r)
    done
done
