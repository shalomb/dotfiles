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
  NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=${PI_HEAP_MB:-1024}" \
    systemd-run --user --scope -q \
    -p MemoryHigh="${PI_MEM_HIGH:-2G}" -p MemoryMax="${PI_MEM_MAX:-3G}" \
    -p MemorySwapMax=0 -p CPUQuota="${PI_CPU_QUOTA:-70%}" \
    nice -n 15 \
    sh -c 'echo 500 > /proc/self/oom_score_adj 2>/dev/null; exec "$@"' _ \
    ~/.local/bin/pi "$@"
}
