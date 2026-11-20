#!/bin/bash
# AGENT_CONTEXT: _pi_run launches the real pi, inside a memory-limited cgroup scope
# DESIGN_PATTERN: OOM-friendly launcher (mirrors claude()/gemini()). Whole pi tree
#   lives in one transient user scope, so a runaway kills only pi, not the desktop.
#   Tunables: PI_MEM_HIGH, PI_MEM_MAX, PI_CPU_QUOTA, PI_HEAP_MB. PI_NO_LIMITS=1 bypasses.

_pi_run() {
  if [[ -n "${PI_NO_LIMITS:-}" ]] || ! command -v systemd-run >/dev/null; then
    command pi "$@"
    return
  fi
  agentctl gpg recover 2>/dev/null
  # pi-lens memory and cache bounds: fast idle eviction (3 min vs 20 min default),
  # aggressive graph byte cap (100MB vs 500MB), and bounded project file scale.
  export PI_LENS_LSP_IDLE_EVICT_MS="${PI_LENS_LSP_IDLE_EVICT_MS:-180000}"
  export PI_LENS_TS_IDLE_EVICT_MS="${PI_LENS_TS_IDLE_EVICT_MS:-180000}"
  export PI_LENS_REVIEW_GRAPH_IDLE_EVICT_MS="${PI_LENS_REVIEW_GRAPH_IDLE_EVICT_MS:-180000}"
  export PI_LENS_WORD_INDEX_IDLE_EVICT_MS="${PI_LENS_WORD_INDEX_IDLE_EVICT_MS:-180000}"
  export PI_LENS_GRAPH_MAX_IN_MEMORY_BYTES="${PI_LENS_GRAPH_MAX_IN_MEMORY_BYTES:-104857600}"
  export PI_LENS_MAX_PROJECT_FILES="${PI_LENS_MAX_PROJECT_FILES:-1000}"
  export PI_LENS_LSP_BUDGET_RSS_MB="${PI_LENS_LSP_BUDGET_RSS_MB:-400}"

  # Background jobs shell policy: isolate bg_run commands into their own cgroup scope
  export PI_BG_POSIX_SHELL=bash
  export PI_BG_POSIX_SHELL_PATH="$HOME/.local/bin/bg-scoped-bash"

  NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=${PI_HEAP_MB:-1024}" \
    systemd-run --user --scope -q \
    -p MemoryHigh="${PI_MEM_HIGH:-2G}" -p MemoryMax="${PI_MEM_MAX:-3G}" \
    -p MemorySwapMax=0 -p CPUQuota="${PI_CPU_QUOTA:-70%}" \
    nice -n 15 \
    sh -c 'echo 500 > /proc/self/oom_score_adj 2>/dev/null; exec "$@"' _ \
    ~/.local/bin/pi "$@"
}
