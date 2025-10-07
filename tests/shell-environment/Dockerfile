# AGENT_CONTEXT: Clean-room shell environment for testing dotfiles
# ARCHITECTURE: Multi-stage build with minimal base + shell tools
# DESIGN_PATTERN: Isolated testing environment

FROM ubuntu:22.04

# Install essential tools for shell testing
RUN apt-get update && apt-get install -y \
    bash \
    git \
    curl \
    wget \
    vim \
    nano \
    tmux \
    fzf \
    exa \
    bat \
    ripgrep \
    fd-find \
    jq \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create test user
RUN useradd -m -s /bin/bash testuser
USER testuser
WORKDIR /home/testuser

# Set up basic environment
ENV HOME=/home/testuser
ENV SHELL=/bin/bash

# Set up basic shell environment
RUN echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
RUN echo 'export EDITOR=vim' >> ~/.bashrc

# Create test script
COPY tests/shell-environment/test-shell.sh /home/testuser/test-shell.sh
RUN chmod +x /home/testuser/test-shell.sh

# Default command
CMD ["/home/testuser/test-shell.sh"]
