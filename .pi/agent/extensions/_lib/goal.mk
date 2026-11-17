# Test ladder for the /goal + /drive topic (see ../pi-ladder.mk).
goal_DIR    := $(dir $(lastword $(MAKEFILE_LIST)))
goal_STATIC := goal.ts goal-io.ts goal-flow.ts goal-help.ts drive-gate.ts drive-gate-io.ts replay.ts next-hop.ts kr.ts grill.ts
goal_UNIT   := goal goal-help drive-gate replay next-hop grill
goal_IO     := goal-io drive-gate-io kr
goal_FLOW   := goal-flow
$(eval $(call ladder,goal))
