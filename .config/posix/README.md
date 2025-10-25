# POSIX-Compliant Shell Scripts

This directory contains shell scripts that are intended to be POSIX compliant.
They are sourced by `.profile` to set up universal environment variables
that should be available to all login shells, including non-Bash shells.

## Linting and Validation

To ensure POSIX compliance, scripts in this directory should be linted with `shellcheck`
using the `--shell=sh` option.

Example:
```bash
shellcheck --shell=sh 00-path.sh
```

Additionally, you can test for POSIX compliance by running the script with `dash` (a common POSIX shell):
```bash
dash -n 00-path.sh
```
