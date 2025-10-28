#!/bin/bash
# AGENT_CONTEXT: Detect host OS and select matching container image
# ARCHITECTURE: OS detection with fallback logic
# DESIGN_PATTERN: OS fingerprinting for container image selection

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" >&2
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" >&2
}

log_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

# Detect OS and version
detect_os() {
    local os_id=""
    local os_version=""
    local os_version_codename=""
    local arch=""

    # Get architecture
    arch=$(uname -m)
    log_info "Architecture: $arch"

    # Read /etc/os-release
    if [[ -f /etc/os-release ]]; then
        # shellcheck disable=SC1091
        source /etc/os-release
        os_id="${ID:-}"
        os_version="${VERSION_ID:-}"
        os_version_codename="${VERSION_CODENAME:-}"
    else
        log_error "Cannot detect OS: /etc/os-release not found"
        return 1
    fi

    log_info "Detected OS: $os_id"
    log_info "Version: $os_version ($os_version_codename)"

    # Map to container image
    local image=""
    case "$os_id" in
        debian)
            case "$os_version_codename" in
                trixie)
                    image="debian:trixie"
                    ;;
                bookworm)
                    image="debian:bookworm"
                    ;;
                bullseye)
                    image="debian:bullseye"
                    ;;
                *)
                    log_warning "Unknown Debian version: $os_version_codename, using trixie"
                    image="debian:trixie"
                    ;;
            esac
            ;;
        ubuntu)
            case "$os_version" in
                24.04)
                    image="ubuntu:24.04"
                    ;;
                22.04)
                    image="ubuntu:22.04"
                    ;;
                20.04)
                    image="ubuntu:20.04"
                    ;;
                *)
                    log_warning "Unknown Ubuntu version: $os_version, using 22.04"
                    image="ubuntu:22.04"
                    ;;
            esac
            ;;
        fedora)
            if [[ -n "$os_version" ]]; then
                image="fedora:$os_version"
            else
                log_warning "Cannot determine Fedora version, using latest"
                image="fedora:latest"
            fi
            ;;
        centos|rhel)
            if [[ -n "$os_version" ]]; then
                image="centos:stream${os_version%%.*}"
            else
                image="centos:stream9"
            fi
            ;;
        arch)
            image="archlinux:latest"
            ;;
        alpine)
            image="alpine:latest"
            ;;
        *)
            log_warning "Unknown OS: $os_id, falling back to debian:trixie"
            image="debian:trixie"
            ;;
    esac

    log_success "Selected container image: $image"

    # Output in machine-readable format
    cat <<EOF
OS_ID=$os_id
OS_VERSION=$os_version
OS_VERSION_CODENAME=$os_version_codename
ARCH=$arch
CONTAINER_IMAGE=$image
EOF
}

# Main execution
detect_os
