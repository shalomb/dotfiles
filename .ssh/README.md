# SSH Configuration Management

This directory contains **ONLY** safe SSH configuration files that can be version controlled.

## ✅ Safe to Version Control
- `config` - SSH client configuration with placeholders
- `known_hosts` - Known host fingerprints
- `*.pub` - Public keys (safe to share)
- `authorized_keys` - Authorized public keys for this host
- `.gitignore` - Security rules to prevent committing secrets

## 🚨 NEVER Version Control
- `id_*` - Private key files (id_rsa, id_ed25519, etc.)
- `*_rsa`, `*_dsa`, `*_ecdsa`, `*_ed25519` - Private keys
- `*.pem`, `*.key`, `*.p12`, `*.pfx` - Private key formats
- `agent-*`, `auth_sock*` - SSH agent sockets
- `control-*` - SSH control sockets
- `*.bak`, `*.tmp`, `*.old` - Backup files

## Usage
These configs are deployed to `~/.ssh/` via the dotfile manager:
```bash
uv run python -m dotfile_manager export .ssh/
```

## Security
The `.gitignore` file ensures private SSH keys are never accidentally committed.

## Public Key Email Update
The public key has been updated with the correct email address: `s.bhooshi@gmail.com`
