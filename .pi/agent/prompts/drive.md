---
description: Execute the locked /goal as Main Copilot over Builder/Critic sub-agents (motorway by default, or scenic)
argument-hint: "[scenic] [extra instructions]"
---

First load the `drive` skill and follow it. Driving mode: scenic if the first word of the arguments below is `scenic`, otherwise motorway. Between stops, never ask the user; log decisions instead. You are the orchestrator: protect your context, delegate every code change to a Builder sub-agent, and edit scope files yourself only if the skill's Solo budget holds. Get the locked goal's done_check passing.

$@
