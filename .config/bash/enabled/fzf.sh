#!/bin/bash

fzf_install_dir="$HOME/projects/junegunn/fzf"
fzf_bin_dir="$fzf_install_dir/bin"

install-fzf() {
  if [[ ! -d $fzf_install_dir ]]; then
    git clone https://github.com/junegunn/fzf.git "$fzf_install_dir"
  fi

  ( builtin cd $fzf_install_dir;
    echo "Updating $fzf_install_dir"
    git remote -v
    git clean -f -d -q
    git reset --hard origin/master
    git pull origin master
  )

  cp -av "$fzf_bin_dir/"* ~/.local/bin/

  local latest_tag=$(curl -fsSL 'https://api.github.com/repos/junegunn/fzf/releases/latest' | jq -cer '.tag_name')
  local url="https://github.com/junegunn/fzf/releases/download/$latest_tag/fzf-${latest_tag}-linux_amd64.tar.gz"
  local file="${url##*/}"
  local _TMP=$(mktemp -d)

  if cd "$_TMP"; then
    echo "Fetching release $latest_tag from $url"
    wget -qc "$url" -O "$file"
    tar zxvf "$file" -C ~/.local/bin
  fi

  rm -fr "$_TMP"
  fzf --version
}

  fzf_overlay_dir="${fzf_install_dir}-overlay"

  # --- FZF Completion Caching ---
  _cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
  _completion_file="${_cache_dir}/fzf-completion.bash"
  _fzf_completion_source="${fzf_install_dir}/shell/completion.bash"

  # Ensure the source file exists before proceeding
  if [[ -f "$_fzf_completion_source" ]]; then
    mkdir -p "$_cache_dir"
    # If the cache file doesn't exist, or if the source is newer, regenerate it.
    if [[ ! -f "$_completion_file" || "$_fzf_completion_source" -nt "$_completion_file" ]]; then
      cp "$_fzf_completion_source" "$_completion_file"
    fi
    # Source the cached file.
    source "$_completion_file"
  fi
  # --- End Caching ---

  source "$fzf_install_dir/shell/key-bindings.bash" 2> /dev/null

  if [[ -d $fzf_overlay_dir ]]; then
    for overlay in "$fzf_overlay_dir"/*sh; do
      source "$overlay"
    done
  fi
