## dotfiles

Track dotfiles as hardlinks to files tracked in a git repo

## Installation

```bash
sudo apt install --no-install-{recommends,suggests} make git
echo "$USER ALL=(ALL) NOPASSWD: ALL" | sudo tee "/etc/sudoers.d/$USER"
mkdir -p ~/.config/dotfiles/
cd !$
git clone git://github.com/shalomb/dotfiles.git .
make install
```

## Managing change

## Managed files

`./dotfile_stash` install files within the repository as hard links to
counterpart locations in the home directory (and as such the repo needs to
exist on the same file system) and so changes to any of the managed
dotfiles appear as changes in the repository.

```bash
cd ~/.config/dotfiles/
git status --
```

## New files

New files can be imported into the repository.

```bash
cd ~/.config/dotfiles/
./dotfile_stash import .bin/somefile
git add !$
git commit -m 'Added .bin/somefile'
```

## XDG-Compliant Deployment

The repository now supports XDG-compliant deployment for bash configuration files:

```bash
# Deploy bash configurations with XDG compliance
./scripts/deploy-bash-xdg.sh deploy

# Verify deployment status
./scripts/deploy-bash-xdg.sh status
```

This creates symlinks in the home directory pointing to XDG-compliant paths in the repository, solving the symlink chain fragility issues while maintaining full XDG Base Directory specification compliance.

## TODO

* encrypt certain files ??
* ~~rewrite `./dotfile_stash`~~ ✅ **COMPLETED**: XDG-compliant deployment implemented
* decompose the monolith - into submodules?
