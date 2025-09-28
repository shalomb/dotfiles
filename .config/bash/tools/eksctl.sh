#!/bin/bash

install-eksctl() {
	# for ARM systems, set ARCH to: `arm64`, `armv6` or `armv7`
	ARCH=arm64
	PLATFORM=$(uname -s)_$ARCH

	: "${TMPDIR=$(mktemp -d)}"

	(
		cd "$TMPDIR" || exit 8

		curl -sLO "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$PLATFORM.tar.gz"
		# (Optional) Verify checksum
		curl -sL "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_checksums.txt" | grep "$PLATFORM" | sha256sum --check

		tar -xzf "eksctl_$PLATFORM.tar.gz" -C "$TMP" && rm -f "eksctl_$PLATFORM.tar.gz"

		chmod +x "$TMP/eksctl"
		sudo mv -v "$TMP/eksctl" /usr/local/bin
	)
}
