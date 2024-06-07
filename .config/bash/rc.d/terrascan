#!/bin/bash

install-terrascan() {
	tmpdir=$(mktemp -d)
	(
		cd "$tmpdir" || exit 1
		curl -fsSL "$(curl -s https://api.github.com/repos/tenable/terrascan/releases/latest | grep -o -E "https://.+?_Linux_arm64.tar.gz")" >terrascan.tar.gz
		tar -xf terrascan.tar.gz terrascan && rm -f terrascan.tar.gz
		install terrascan "$XDG_DATA_HOME/../bin/" && rm -f terrascan
		type -a terrascan
	)
	rm -fr "$tmpdir"
}
