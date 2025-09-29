# Cursor-Agent Container Orchestration Concept

## Goal
Run cursor-agent in Podman containers with strict context and boundaries for security, using an instance-per-directory approach.

## Problem Statement
- **Security Risk**: cursor-agent has already executed `sudo rm -rf ~` causing data loss
- **Need**: Safe execution environment that prevents destructive operations outside working directory
- **Workflow**: Interactive back-and-forth sessions across multiple directories
- **Tools Required**: git/gh/curl/jq/rg + coreutils + custom dotfiles-managed tools

## Core Concept: Instance-Per-Directory

### Basic Approach
- **One container per directory**: Each working directory gets its own isolated cursor-agent instance
- **Ephemeral containers**: New container for each session/command
- **Directory isolation**: Read access to adjacent/parent dirs, write access only in working directory
- **Tool integration**: All dotfiles-managed tools available in container

### Container Architecture

#### Base Container
```dockerfile
FROM debian:latest

# Install cursor-agent
RUN curl https://cursor.com/install -fsS | bash

# Install core tools
RUN apt-get update && apt-get install -y \
    git curl jq ripgrep \
    coreutils build-essential

# Copy dotfiles-managed tools
COPY .local/bin/ /usr/local/bin/
COPY .config/*-tools*/ /usr/local/bin/

# Apply bash initialization patch
RUN cursor-agent-patch.sh apply

WORKDIR /workspace
ENTRYPOINT ["/bin/bash"]
```

#### Container Execution
```bash
# Basic execution pattern
podman run --rm -it \
  -v "$PWD:$PWD" \
  -v "$HOME/.local/bin:/usr/local/bin:ro" \
  -v "$HOME/.config:/config:ro" \
  -w "$PWD" \
  cursor-agent-container \
  cursor-agent --print --force "user prompt"
```

### Directory Access Model

#### Read Access (RO mounts)
- **Working directory**: Full read access
- **Parent directories**: Read-only access for context
- **Adjacent directories**: Read-only access for context
- **Home directory**: Read-only access to configs/tools

#### Write Access (RW mounts)
- **Working directory only**: Full read/write access
- **No parent directory writes**: Prevents `rm -rf ..` scenarios
- **No system directory access**: Prevents `sudo rm -rf /` scenarios

### Tool Integration Strategy

#### Dotfiles Integration
- **Tool copying**: Copy all tools from `.local/bin/`, `.config/*-tools*/`
- **Dependency management**: Include all tool dependencies
- **Version synchronization**: Rebuild container when tools update
- **Custom tool support**: Include user's custom tools

#### Tool Categories
- **Core tools**: git, gh, curl, jq, rg, coreutils
- **Development tools**: build-essential, python, node, etc.
- **Custom tools**: All dotfiles-managed tools
- **System tools**: Basic system utilities

### Security Boundaries

#### What's Allowed
- **File operations**: Read/write in working directory
- **Git operations**: Full git access (local and remote)
- **Tool execution**: All installed tools
- **Network access**: curl, git push/pull, etc.

#### What's Blocked
- **Parent directory writes**: Cannot modify files outside working directory
- **System modifications**: No sudo, no system file changes
- **Container escape**: No privileged mode, no host system access
- **Dangerous commands**: rm outside working directory, dd, etc.

### Implementation Phases

#### Phase 1: Basic Container
- [ ] Fix Containerfile (Debian base, correct cursor-agent installation)
- [ ] Implement basic tool copying
- [ ] Test basic cursor-agent execution
- [ ] Verify directory isolation

#### Phase 2: Tool Integration
- [ ] Copy all dotfiles-managed tools
- [ ] Test tool availability in container
- [ ] Verify tool functionality
- [ ] Test custom tool integration

#### Phase 3: Security Hardening
- [ ] Implement strict directory boundaries
- [ ] Test destructive command blocking
- [ ] Verify read-only mounts work correctly
- [ ] Test edge cases (symlinks, etc.)

#### Phase 4: Orchestration
- [ ] Create orchestration script
- [ ] Implement instance-per-directory logic
- [ ] Add logging and monitoring
- [ ] Test multi-directory workflows

### Usage Patterns

#### Basic Usage
```bash
# In any directory
cursor-agent-container "analyze this codebase"
cursor-agent-container "run tests and report results"
cursor-agent-container "check for security issues"
```

#### Orchestration Usage
```bash
# Multiple directories
cursor-agent-container /path/to/project1 "analyze structure"
cursor-agent-container /path/to/project2 "run tests"
cursor-agent-container /path/to/project3 "check security"
```

### Logging & Monitoring

#### Container Logs
- **Location**: `/var/log/cursor-agent/` (standard Linux location)
- **Format**: Structured JSON with timestamps
- **Rotation**: Standard logrotate configuration
- **Analysis**: Automated parsing for dangerous commands

#### Monitoring
- **Command logging**: All commands executed in containers
- **File access**: Track file reads/writes
- **Resource usage**: CPU/memory per container
- **Security events**: Flagged dangerous operations

### Future Considerations

#### Advanced Features (Future)
- **Session management**: Long-running sessions across container restarts
- **Session coordination**: Multiple containers sharing session state
- **State persistence**: Maintain context across container lifecycle
- **Resource optimization**: Shared base images, incremental builds

#### Performance Optimizations
- **Container reuse**: Keep containers alive for multiple commands
- **Tool caching**: Cache frequently used tools
- **Image optimization**: Multi-stage builds, smaller images
- **Parallel execution**: Multiple containers for different tasks

## Benefits

### Security
- **Isolation**: Container boundaries prevent system-wide damage
- **Controlled environment**: Only explicitly allowed tools and directories
- **Audit trail**: Complete logging of all operations
- **Recovery**: Easy to restore from snapshots

### Development Workflow
- **Consistent environment**: Same tools available everywhere
- **Clean state**: Fresh environment for each session
- **Tool integration**: All dotfiles-managed tools available
- **Context preservation**: Read access to surrounding directories

### Maintainability
- **Reproducible**: Same environment across different systems
- **Version control**: Pin specific tool versions
- **Easy updates**: Rebuild container when tools change
- **Simple deployment**: Single container image

## Risks & Mitigations

### Performance Overhead
- **Risk**: Container startup time for each command
- **Mitigation**: Optimize container startup, consider persistent containers

### Tool Compatibility
- **Risk**: Tools may not work in container environment
- **Mitigation**: Test all tools, provide fallbacks

### File Permission Issues
- **Risk**: Container user vs host user mapping
- **Mitigation**: Proper user mapping, test edge cases

### Network Isolation
- **Risk**: Some workflows may need network access
- **Mitigation**: Allow network access, monitor network usage

## Next Steps

1. **Implement basic container**: Fix Containerfile, test basic functionality
2. **Test tool integration**: Verify all required tools work
3. **Implement security boundaries**: Test directory isolation
4. **Create orchestration script**: Instance-per-directory logic
5. **Add logging**: Container-level logging and monitoring
6. **Test real workflows**: Use with actual development tasks

This concept provides a solid foundation for safe cursor-agent execution while maintaining development productivity.