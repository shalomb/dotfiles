# Bash-Specific Shell Scripts and Configuration

This directory contains scripts and configuration files specifically designed for Bash.
These files leverage Bash-specific features and syntax, and are not intended to be POSIX compliant.

## Linting and Validation

To ensure correctness and adherence to Bash best practices, scripts in this directory should be linted with `shellcheck`
using the `--shell=bash` option.

Example:
```bash
shellcheck --shell=bash lib/01-functions
```

Additionally, you can perform a syntax check using `bash -n`:
```bash
bash -n lib/01-functions
```
