# pi-ladder.mk: a graduated test ladder for pi extensions, generated from per-topic fragments.
#
# A topic is a small fragment `<topic>.mk` that sits next to the code it tests and holds variables only:
#
#     goal_DIR    := $(dir $(lastword $(MAKEFILE_LIST)))
#     goal_STATIC := goal.ts goal-flow.ts        # files that must compile (bun build --no-bundle)
#     goal_UNIT   := goal goal-help              # pure tests, no I/O          (<name>.test.ts)
#     goal_IO     := goal-io persist             # temp dirs, git, subprocess  (<name>.test.ts)
#     goal_FLOW   := goal-flow                   # command/UX layer            (<name>.test.ts)
#     $(eval $(call ladder,goal))
#
# Each topic gets test-<topic>-{static,unit,io,flow} and test-<topic>. A rung depends on the one below it,
# so asking for a rung runs everything under it and stops at the first red one.
# Fragments are discovered under LADDER_ROOT; the root Makefile never lists topics.
#
#     make test-ladders        guard + every topic
#     make test-<topic>        one topic, all rungs
#     make test-<topic>-unit   one topic, up to and including the unit rung
#     make ladder-check        orphan / missing test files only
#
# Each rung is a single && chain, so it behaves the same under .ONESHELL.

LADDER_ROOT ?= $(dir $(lastword $(MAKEFILE_LIST)))
PI_TOPICS :=
LADDER_TESTS :=
LADDER_DIRS :=

define ladder
PI_TOPICS += $(1)
LADDER_DIRS += $($(1)_DIR)
LADDER_TESTS += $(addprefix $($(1)_DIR),$(addsuffix .test.ts,$($(1)_UNIT) $($(1)_IO) $($(1)_FLOW)))

.PHONY: test-$(1) test-$(1)-static test-$(1)-unit test-$(1)-io test-$(1)-flow

test-$(1)-static:
	@$(if $($(1)_STATIC),echo "[$(1)] static" && cd $($(1)_DIR) && for f in $($(1)_STATIC); do bun build --no-bundle $$$$f >/dev/null || { echo "[$(1)] static: does not compile: $$$$f" >&2; exit 1; }; done,echo "[$(1)] static (none)")

test-$(1)-unit: test-$(1)-static
	@$(if $($(1)_UNIT),echo "[$(1)] unit" && cd $($(1)_DIR) && bun test $(addprefix ./,$(addsuffix .test.ts,$($(1)_UNIT))),echo "[$(1)] unit (none)")

test-$(1)-io: test-$(1)-unit
	@$(if $($(1)_IO),echo "[$(1)] io" && cd $($(1)_DIR) && bun test $(addprefix ./,$(addsuffix .test.ts,$($(1)_IO))),echo "[$(1)] io (none)")

test-$(1)-flow: test-$(1)-io
	@$(if $($(1)_FLOW),echo "[$(1)] flow" && cd $($(1)_DIR) && bun test $(addprefix ./,$(addsuffix .test.ts,$($(1)_FLOW))),echo "[$(1)] flow (none)")

test-$(1): test-$(1)-flow
endef

include $(filter-out %/pi-ladder.mk,$(wildcard $(LADDER_ROOT)*.mk $(LADDER_ROOT)*/*.mk))

.PHONY: ladder-check test-ladders

# Fail if a *.test.ts in a topic directory belongs to no topic, or a topic names a test that does not exist.
# Orphans listed (one basename per line) in $(LADDER_ROOT)ladder-orphans.txt are tolerated: that list may only shrink.
ladder-check: ## Fail on pi test files that belong to no topic ladder (baseline: _lib/ladder-orphans.txt)
	@fail=0; \
	for d in $(sort $(LADDER_DIRS)); do \
		for f in $$d*.test.ts; do \
			[ -e "$$f" ] || continue; \
			case " $(LADDER_TESTS) " in *" $$f "*) continue;; esac; \
			rg -qxF -- "$${f##*/}" "$(LADDER_ROOT)ladder-orphans.txt" 2>/dev/null && continue; \
			echo "ladder-check: orphan test (in no topic): $$f" >&2; fail=1; \
		done; \
	done; \
	for f in $(LADDER_TESTS); do \
		[ -f "$$f" ] || { echo "ladder-check: missing test file named by a topic: $$f" >&2; fail=1; }; \
	done; \
	exit $$fail

test-ladders: ladder-check $(addprefix test-,$(PI_TOPICS)) ## Guard + every pi test ladder (also: test-<topic>[-unit|-io|-flow], ladder-check)
