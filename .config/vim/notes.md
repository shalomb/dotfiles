# vim-go

requires
  - vim >= 8.1.2269-1
  - 2:1.13~1

dir=$(mktemp -d)
cd $dir
echo 'module main' > go.mod
go get -v -u golang.org/x/tools/gopls@latest

vim +GoInstallBinaries
vim +GoUpgradeBinaries

# vi:ts=2 sw=2 et
