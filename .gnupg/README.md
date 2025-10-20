# GPG Configuration Management

This directory contains **ONLY** safe GPG configuration files that can be version controlled.

## ✅ Safe to Version Control
- `gpg.conf` - GPG preferences and settings
- `gpg-agent.conf` - GPG agent configuration
- `dirmngr.conf` - Directory manager configuration
- `.gitignore` - Security rules to prevent committing secrets

## 🚨 NEVER Version Control
- `private-keys-v1.d/` - Private key material
- `secring.gpg` - Secret keyring
- `trustdb.gpg` - Trust database
- `sshcontrol` - SSH key control
- `S.gpg-agent*` - Agent sockets
- `random_seed` - Random seed data
- `*.key`, `*.asc`, `*.gpg`, `*.sig` - Key files

## Usage
These configs are deployed to `~/.gnupg/` via the dotfile manager:
```bash
uv run python -m dotfile_manager export .gnupg/
```

## Security
The `.gitignore` file ensures sensitive GPG data is never accidentally committed.
