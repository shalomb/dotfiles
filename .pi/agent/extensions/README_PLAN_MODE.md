# Plan Mode Extension

**Location:** `~/.pi/agent/extensions/plan-command.ts`

Plan Mode is a `/plan` slash command that puts your pi session into **planning and research mode**. In this mode, the agent can read, analyze, and propose—but cannot modify files or run dangerous commands.

## 🚀 Quick Start

```bash
/plan on              # Enter plan mode (no file modifications)
/plan off             # Exit plan mode (resume full capabilities)
/plan status          # Check current status
```

Enter plan mode and ask planning questions:
```
/plan on
"Design a new authentication system"
"Analyze the current database schema"
"Propose a refactoring strategy"
```

The agent will read, analyze, and propose without making any changes. When ready to implement:
```
/plan off
"Now implement the design we discussed"
```

## 📊 What Gets Blocked/Allowed

### Blocked Operations ❌
- `write` - File creation/overwriting
- `edit` - File modification
- `bash rm` - Delete files/directories
- `bash mv` - Move/rename files
- `bash cp` - Copy files
- `bash mkdir`, `touch`, `chmod`, `chown` - Filesystem operations
- `bash >` or `>>` - Redirections to files
- `bash | tee` - Pipe to tee

### Allowed Operations ✅
- `read` - Read file contents
- `grep` - Search files
- `find` - Find files by pattern
- `ls` - List directories
- `bash cat`, `find`, `grep`, `ls` - Safe queries

## 🔑 How It Works

Three layers of protection:
1. **Command Interface** - `/plan on`, `/plan off`, `/plan status`
2. **Tool Call Blocking** - Intercepts write/edit/bash before execution
3. **System Prompt Injection** - Educates agent about constraints

## 💾 State Persistence

Plan mode state is **automatically saved** and persists across:
- ✅ Process restarts
- ✅ Extension reloads (`/reload`)
- ✅ Session forks (`/fork`)
- ✅ Session navigation (`/tree`)

## 🎭 Integration with Agent Personas

Plan mode works seamlessly with agent personas:

| Persona | Use Case | Command |
|---------|----------|---------|
| **Marge** (Product) | Gather requirements | `/plan on` + `/skill:marge` |
| **Lisa** (Planning) | Design architecture | `/plan on` + `/skill:lisa` |
| **Bart** (Quality) | Review for issues | `/plan on` + `/skill:bart` |
| **Ralph** (Build) | Implement | `/plan off` + `/skill:ralph` |
| **Lovejoy** (Release) | Document & release | `/skill:lovejoy` |

## 🎯 Common Workflows

### Design a Feature
```
/plan on
/skill:marge          "Write user stories"
/skill:lisa           "Design the architecture"
/skill:bart           "Review for issues"
/plan off
/skill:ralph          "Implement"
```

### Plan a Refactor
```
/plan on
/skill:lisa           "Propose refactoring structure"
/plan off
/skill:ralph          "Execute the refactor"
```

### Code Review
```
/plan on
/skill:bart           "Review code for issues"
[Discuss findings]
/plan off
/skill:ralph          "Implement fixes"
```

### Incident Response
```
/plan on
/skill:bart           "Analyze what went wrong"
/skill:lisa           "Design the fix"
/plan off
/skill:ralph          "Implement the fix"
/skill:lovejoy        "Create postmortem"
```

## 📖 Examples

### Example 1: Design New Feature
```
You:   /plan on
You:   I want to add user roles to our system. Analyze the current auth system and propose a design.
Agent: [Reads code, explains current system, proposes role-based design]
You:   /plan off
You:   Implement the proposal from the design discussion.
Agent: [Creates new files, modifies existing code]
```

### Example 2: Plan a Refactor
```
You:   /plan on
You:   Our email service is getting bloated. Design a new architecture.
Agent: [Analyzes code, identifies tight coupling, proposes microservice split]
You:   Looks good. /plan off
You:   Implement the refactor.
Agent: [Executes the plan]
```

### Example 3: Code Review
```
You:   /plan on
You:   Review this code for security issues and propose fixes.
Agent: [Reads code, identifies issues, proposes fixes without implementing]
You:   [Discuss issues and improvements]
You:   /plan off
You:   Implement the critical fix for XSS.
Agent: [Makes the fix]
```

## 🔧 Customization

To modify blocked patterns, edit `plan-command.ts`:

```typescript
const modificationPatterns = [
  /^rm\s/i,        // Block rm commands
  /^mv\s/i,        // Block mv commands
  // Add more patterns as needed
];
```

To change the planning prompt injected into the system:

```typescript
const planningPrompt = `
  // Your custom prompt here
`;
```

## 🆘 Troubleshooting

### "Plan mode blocks my safe command"
If a safe command like `find` is being blocked, it may be matching a redirection pattern. Use `cat` instead of redirections, or exit plan mode temporarily.

### "Plan mode didn't persist"
Ensure you're using the same session. Plan state is stored per-session. Switching to a new session with `/new` will start with plan mode off.

### "Agent still tries to modify files"
The system prompt is injected, but agents might still try. The tool_call handler is the final safety net and will reject the operation. If this happens repeatedly, provide explicit instructions:
```
I'm in plan mode. Only propose changes, don't execute them.
```

## 📚 Use Cases

**Ideal for:**
- Feature design & requirements gathering
- Architecture & system design
- Code review and quality analysis
- Planning refactors and migrations
- Incident response & problem solving
- Team collaboration & discussion

**Prevents:**
- Accidental file changes during planning
- Premature implementation
- Scope creep in discussions
- Unvetted architectural changes

## 🚀 Getting Started

1. **Start a pi session**
   ```bash
   pi
   ```

2. **Enter plan mode**
   ```
   /plan on
   ```

3. **Ask planning questions**
   ```
   "Design a new feature"
   "Analyze the current architecture"
   "Propose improvements"
   ```

4. **Exit and implement when ready**
   ```
   /plan off
   "Now implement what we planned"
   ```

## ⚡ Pro Tips

💡 **Let Lisa Create the Plan**
```
/plan on
/skill:lisa
"Create a detailed implementation plan with effort estimates"
```
Use Lisa's output as the roadmap. Reference it during implementation.

💡 **Have Bart Review Before Ralph Implements**
```
/plan on
/skill:bart "Review the proposed implementation for issues"

/skill:ralph "Implement, addressing Bart's feedback"
```

💡 **Use Chat History as Documentation**
```
/plan on
[Long planning discussion with Lisa and Bart]

/plan off
[Implement]

Later:
"Summarize the planning discussion we had"
```
Creates documentation from the chat history.

💡 **Safe Experimentation**
```
/plan on
[Run questions to verify assumptions]
[Agent can't accidentally break anything]

/plan off
[Proceed with confidence]
```

## 📋 Architecture

### Extension Components

**Event Handlers:**
- `session_start` - Restores plan mode state from previous session
- `tool_call` - Blocks dangerous tools and file modifications
- `before_agent_start` - Injects planning-focused system prompt

**Commands:**
- `/plan on` - Activate plan mode
- `/plan off` - Deactivate plan mode
- `/plan status` - Show current status

**State Management:**
- In-memory: `planState` object
- Persisted: Via `pi.appendEntry("plan-state", ...)`
- Restored: On `session_start`

### Tool Blocking Strategy

Uses regex pattern matching to detect filesystem modifications in bash commands:

**Safe patterns:**
- `ls -la` ✅
- `find . -name "*.ts"` ✅
- `grep -r "TODO" src/` ✅
- `cat file.txt` ✅

**Blocked patterns:**
- `rm -rf dist` ❌
- `mv src/ backup/` ❌
- `mkdir new-dir` ❌
- `echo "text" > file.txt` ❌

## 📄 License

Part of the pi coding agent framework.

## 🔗 Related

- **Pi Extension API:** See `@mariozechner/pi-coding-agent` documentation
- **Agent Personas:** Available via `/skill:marge`, `/skill:lisa`, `/skill:bart`, `/skill:ralph`, `/skill:lovejoy`
- **Session Management:** Uses `ctx.sessionManager` for state persistence
- **Tool System:** Integrates with pi's tool execution pipeline

---

**Start with:** `/plan on`

**Learn more:** Check the inline comments in `plan-command.ts`

**Extend:** Edit the extension to add custom patterns or integrate with team workflows
