#### dotfiles

Track dotfiles as hardlinks to versions in a local git repo

#### Installation

    mkdir ~/.config/dotfiles/
    cd !$
    git clone git://github.com/shalomb/dotfiles.git .
    ./dotfile_stash export ./  # Install all dotfiles

#### Managing change

##### Managed files

`./dotfile_stash` install files within the repository as hard links to
counterpart locations in the home directory (and as such the repo needs to
exist on the same file system) and so changes to any of the managed
dotfiles appear as changes in the repository.

    cd ~/.config/dotfiles/
    git status --

##### New files

New files can be imported into the repository.

    cd ~/.config/dotfiles/
    ./dotfile_stash import .bin/somefile
    git add !$
    git commit -m 'Added .bin/somefile'

#### TODO

* fix map such that add actions can be reversed
* target files that exist at a different depth (other than ~/) should be accepted
* consider --delete for rsync
* make the map script configurable
* encrypt certain files ??
* enlist more candidates for inclusion
