#!/bin/bash
# Characterises scripts/prune-terraform-cache.sh against a fixture HOME (never touches the real cache).
set -euo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/prune-terraform-cache.sh"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
export HOME="$FIX"
unset TF_PLUGIN_CACHE_DIR

mk() { mkdir -p "$FIX/$1/$2/linux_arm64"; }
primary=.cache/terraform.d/plugin-cache
legacy=.terraform.d/plugin-cache
for v in 5.1.0 5.2.0 5.10.0 4.9.0; do mk "$primary/registry.terraform.io/hashicorp/aws" "$v"; done
for v in 1.28.1 1.28.2 1.28.10;    do mk "$primary/tf.app.wiz.io/wizsec/wiz" "$v"; done
for v in 3.0.0 3.1.0 3.2.0;        do mk "$legacy/registry.terraform.io/hashicorp/null" "$v"; done

"$SCRIPT" 2 >/dev/null

fail=0
expect() { # expect present|absent <path>
  if [[ $1 == present && -d $FIX/$2 ]] || [[ $1 == absent && ! -d $FIX/$2 ]]; then echo "ok   $1 $2"; else echo "FAIL $1 $2"; fail=1; fi
}
aws="$primary/registry.terraform.io/hashicorp/aws"
expect present "$aws/5.10.0"; expect present "$aws/5.2.0"; expect absent "$aws/5.1.0"; expect absent "$aws/4.9.0"
wiz="$primary/tf.app.wiz.io/wizsec/wiz"
expect present "$wiz/1.28.10"; expect present "$wiz/1.28.2"; expect absent "$wiz/1.28.1"
null="$legacy/registry.terraform.io/hashicorp/null"
expect present "$null/3.2.0"; expect present "$null/3.1.0"; expect absent "$null/3.0.0"
exit $fail
