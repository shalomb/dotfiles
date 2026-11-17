# Test ladder for the ladder generator itself (see ../pi-ladder.mk).
ladder_DIR  := $(dir $(lastword $(MAKEFILE_LIST)))
ladder_IO   := pi-ladder
$(eval $(call ladder,ladder))
