# Goal run cursor-agent in podman containers with strict context and boundaries

# The cursor agent needs to be fast but it should also be a safe/secure
execution environment - for both host and container.

# On the host
- Download cursor-agent and set up alias/function
Analyze this installer script - https://cursor.com/install and work out where
it caches the binary - it seems to be ~/.local/share/cursor-agent

- Patch the binary
ls -ld ~/.local/share/cursor-agent has the cursor-agent binary that needs
patching - see .config/patches/

# Containerfile
FROM debian:latest

RUN curor-agent --version

# Optionally copy your tool into the image (if not installed from package manager)
# COPY mytool /usr/local/bin/

WORKDIR /home/cursor

ENTRYPOINT ["/bin/bash"]

# Build the image

- Tools needed?
- All of them that I use that are in $PATH
- This means copying the ~/.local/bin/, ~/.bin/ dirs plus all the system dirs
- containing executables I use?

# deploy it

# deploy alias/function

- alias has to launch in the current directory
cursor command runs 'podman run --rm -it cursor-agent -v "$PWD:$PWD" -w "$PWD" cursor-agent' where cursor-agent is a podman image built from the following
