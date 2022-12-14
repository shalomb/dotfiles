## dotfiles

Track dotfiles as hardlinks to files tracked in a git repo

## Installation

```bash
mkdir ~/.config/dotfiles/
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

## TODO

* encrypt certain files ??
* rewrite `./dotfile_stash`
* decompose the monolith - into submodules?
