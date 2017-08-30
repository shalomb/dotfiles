#!/bin/bash

# Requires

# User to be part of the 'libvirt' group

# and for /etc/polkit-1/rules.d/49-org.libvirt.unix.manager.rules
# to contain

# /* Allow users in kvm group to manage the libvirt
# daemon without authentication */
# 
# polkit.addRule(function(action, subject) {
#       if (action.id == "org.libvirt.unix.manage" &&
#         subject.isInGroup("libvirt")) {
#             return polkit.Result.YES;
#     }
# });

export LIBVIRT_DEFAULT_URI=qemu:///system

