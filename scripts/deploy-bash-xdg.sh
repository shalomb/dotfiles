#!/bin/bash
# Deploy bash configuration with XDG compliance
# This script creates symlinks instead of hard links for better XDG compliance

set -euo pipefail

# Configuration
DOTFILES_ROOT="${DOTFILES_ROOT:-$HOME/.config/dotfiles}"
HOME_DIR="${HOME_DIR:-$HOME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to create symlink with error handling
create_symlink() {
    local source="$1"
    local target="$2"
    local force="${3:-false}"
    
    log_info "Creating symlink: $target -> $source"
    
    # Check if source exists
    if [[ ! -f "$source" ]]; then
        log_error "Source file does not exist: $source"
        return 1
    fi
    
    # Remove existing target if force is enabled
    if [[ "$force" == "true" && -e "$target" ]]; then
        if [[ -L "$target" ]]; then
            log_info "Removing existing symlink: $target"
            rm "$target"
        elif [[ -f "$target" ]]; then
            log_info "Removing existing file: $target"
            rm "$target"
        else
            log_warning "Target exists but is not a file or symlink: $target"
            return 1
        fi
    fi
    
    # Create parent directory if needed
    mkdir -p "$(dirname "$target")"
    
    # Create symlink
    if ln -s "$source" "$target"; then
        log_success "Created symlink: $target -> $source"
        return 0
    else
        log_error "Failed to create symlink: $target -> $source"
        return 1
    fi
}

# Function to deploy bash configuration
deploy_bash_config() {
    local config_file="$1"
    local source="$DOTFILES_ROOT/.config/bash/$config_file"
    local target="$HOME_DIR/.$config_file"
    
    log_info "Deploying bash configuration: $config_file"
    
    if create_symlink "$source" "$target" "true"; then
        log_success "Successfully deployed $config_file"
        return 0
    else
        log_error "Failed to deploy $config_file"
        return 1
    fi
}

# Function to verify deployment
verify_deployment() {
    local config_file="$1"
    local target="$HOME_DIR/.$config_file"
    local source="$DOTFILES_ROOT/.config/bash/$config_file"
    
    log_info "Verifying deployment: $config_file"
    
    if [[ -L "$target" ]]; then
        local link_target
        link_target=$(readlink "$target")
        
        if [[ "$link_target" == "$source" ]]; then
            log_success "$config_file: Symlink correctly points to $source"
            return 0
        else
            log_warning "$config_file: Symlink points to $link_target (expected $source)"
            return 1
        fi
    elif [[ -f "$target" ]]; then
        log_warning "$config_file: Target is a regular file, not a symlink"
        return 1
    else
        log_error "$config_file: Target does not exist"
        return 1
    fi
}

# Function to show deployment status
show_status() {
    log_info "Current deployment status:"
    echo
    
    for config in bashrc profile logout; do
        echo -n "  $config: "
        if verify_deployment "$config" >/dev/null 2>&1; then
            log_success "✅ Deployed correctly"
        else
            log_error "❌ Not deployed correctly"
        fi
    done
    echo
}

# Main function
main() {
    local action="${1:-status}"
    
    log_info "Bash XDG Deployment Script"
    log_info "Dotfiles root: $DOTFILES_ROOT"
    log_info "Home directory: $HOME_DIR"
    echo
    
    case "$action" in
        "deploy")
            log_info "Deploying bash configurations..."
            local success=true
            
            for config in bashrc profile logout; do
                if ! deploy_bash_config "$config"; then
                    success=false
                fi
            done
            
            echo
            if [[ "$success" == "true" ]]; then
                log_success "All bash configurations deployed successfully!"
            else
                log_error "Some deployments failed!"
                return 1
            fi
            ;;
        
        "verify")
            show_status
            ;;
        
        "status")
            show_status
            ;;
        
        *)
            echo "Usage: $0 [deploy|verify|status]"
            echo
            echo "Actions:"
            echo "  deploy  - Deploy bash configurations with XDG compliance"
            echo "  verify  - Verify current deployment status"
            echo "  status  - Show current deployment status (default)"
            return 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"