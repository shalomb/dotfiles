# Use the official Debian Trixie image as a base
FROM debian:trixie

# Install all necessary system-level dependencies
RUN apt-get update && apt-get install -y \
    bash-completion \
    git \
    curl \
    wget \
    jq \
    gpg \
    sudo \
 && rm -rf /var/lib/apt/lists/*

# Create a 'unop' group and user with UID/GID 1001
RUN groupadd -g 1001 unop && \
    useradd -u 1001 -g 1001 -m -s /bin/bash unop

# Add the 'unop' user to the sudo group
RUN usermod -aG sudo unop

# Set the working directory and default user
WORKDIR /home/unop
USER unop

# Set a default command to simply start an interactive bash session
CMD ["/bin/bash"]
