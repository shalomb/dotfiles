/**
 * Plan Mode Extension
 *
 * Provides a `/plan` slash command that puts the session in planning and research mode.
 * In plan mode:
 * - The agent strictly makes NO changes to the file system
 * - Focus is on planning, design, requirements, elicitation, and research
 * - Modification tools (write, edit, bash with dangerous commands) are blocked
 * - Read and query tools remain available for research
 *
 * Usage:
 *   /plan                 - Enter plan mode
 *   /plan off             - Exit plan mode
 *   /plan status          - Show current plan mode status
 *
 * The agent automatically resumes planning when you ask planning questions,
 * and will warn if you try to make modifications while in plan mode.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface PlanState {
  enabled: boolean;
  label?: string;
}

export default function planModeExtension(pi: ExtensionAPI) {
  // Track plan mode state
  let planState: PlanState = {
    enabled: false,
  };

  // Restore plan state from session on startup
  pi.on("session_start", async (_event, ctx) => {
    planState = { enabled: false };

    // Look for previous plan state in session entries
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && entry.customType === "plan-state") {
        planState = entry.data as PlanState;
        if (planState.enabled) {
          ctx.ui.notify("📋 Plan mode is ACTIVE", "info");
        }
        break;
      }
    }
  });

  // Register the /plan command
  pi.registerCommand("plan", {
    description: "Enter or exit planning mode (no file modifications allowed)",
    getArgumentCompletions: (prefix) => {
      const options = ["on", "off", "status"];
      const filtered = options.filter((o) => o.startsWith(prefix));
      return filtered.length > 0 ? filtered.map((o) => ({ value: o, label: o })) : null;
    },
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase() || "on";

      if (action === "on" || action === "") {
        // Enter plan mode
        planState.enabled = true;
        planState.label = undefined;

        // Persist to session
        pi.appendEntry("plan-state", planState);

        ctx.ui.notify(
          "📋 Plan mode ACTIVATED\n\nNo file modifications allowed.\nFocus: planning, design, requirements, research.",
          "info"
        );

        // Optionally, inject a system prompt reminder for this turn
        pi.sendMessage(
          {
            customType: "plan-mode-activated",
            content:
              "Plan mode activated. Focus on planning, design, requirements gathering, and research. " +
              "Do not execute commands that modify files or the system. Propose and discuss solutions instead.",
            display: true,
          },
          { triggerTurn: false }
        );
      } else if (action === "off") {
        // Exit plan mode
        planState.enabled = false;

        // Persist to session
        pi.appendEntry("plan-state", planState);

        ctx.ui.notify("📋 Plan mode DEACTIVATED\n\nFile modifications are now allowed.", "info");
      } else if (action === "status") {
        // Show status
        if (planState.enabled) {
          ctx.ui.notify("📋 Plan mode is ACTIVE\n\nNo file modifications allowed.", "info");
        } else {
          ctx.ui.notify("📋 Plan mode is INACTIVE\n\nFile modifications are allowed.", "info");
        }
      } else {
        ctx.ui.notify(`Unknown action: ${action}. Use 'on', 'off', or 'status'.`, "error");
      }
    },
  });

  // Block dangerous tools when plan mode is active
  pi.on("tool_call", async (event, ctx) => {
    if (!planState.enabled) {
      return; // Plan mode not active, allow all tools
    }

    // In plan mode, block file modifications
    const blockedTools = ["write", "edit"];

    if (blockedTools.includes(event.toolName)) {
      return {
        block: true,
        reason: `📋 Plan mode: ${event.toolName} tool is blocked. Focus on planning and design instead.`,
      };
    }

    // Block bash commands that modify the filesystem
    if (event.toolName === "bash") {
      const command = event.input.command as string;

      // List of patterns that indicate filesystem modification
      const modificationPatterns = [
        /^rm\s/i, // rm, rm -rf
        /^mv\s/i, // mv (move/rename)
        /^cp\s/i, // cp (copy)
        /^mkdir\s/i, // mkdir
        /^touch\s/i, // touch
        /^chmod\s/i, // chmod
        /^chown\s/i, // chown
        /^mkfifo\s/i, // mkfifo
        /^ln\s/i, // ln (link)
        /\s>[>]?\s/i, // Redirection to file (>, >>)
        /\|\s*tee\s/i, // pipe to tee
      ];

      const wouldModify = modificationPatterns.some((pattern) => pattern.test(command));

      if (wouldModify) {
        return {
          block: true,
          reason: `📋 Plan mode: bash command blocked (would modify filesystem). Focus on planning instead.`,
        };
      }
    }

    // Allow safe tools (read, bash queries, find, grep, ls, etc.)
    return;
  });

  // Inject planning-mode context into the system prompt
  pi.on("before_agent_start", async (event, ctx) => {
    if (!planState.enabled) {
      return;
    }

    const planningPrompt =
      "\n\n## Planning Mode Constraints\n" +
      "You are in PLANNING MODE. Your role is to:\n" +
      "- Analyze and understand requirements\n" +
      "- Design solutions and architectures\n" +
      "- Gather and clarify specifications\n" +
      "- Research and explore options\n" +
      "- Propose solutions and alternatives\n" +
      "- Write pseudocode and sketches\n" +
      "\n" +
      "DO NOT:\n" +
      "- Execute file modifications (write, edit)\n" +
      "- Run system commands that change state\n" +
      "- Make any changes to the codebase\n" +
      "\n" +
      "If asked to implement, respond: 'I'm in planning mode. Would you like to exit plan mode (via /plan off) so I can implement this?'\n";

    return {
      systemPrompt: event.systemPrompt + planningPrompt,
    };
  });
}
