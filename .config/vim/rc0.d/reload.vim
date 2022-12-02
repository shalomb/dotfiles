" reload vim

command! -bang -nargs=? -complete=dir Reload source $MYVIMRC <bar> echo(glob("$MYVIMRC") . " reloaded.")
