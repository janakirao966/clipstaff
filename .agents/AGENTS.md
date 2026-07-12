# Workspace Rules

## 🛠️ Post-Task Skill Attribution Reporting
In the final response summary after completing any task, the agent **MUST** include a dedicated "**🛠️ Applied Skills & Rules**" section listing exactly which skills were loaded and followed during the task execution.

### Expected Format
```markdown
## 🛠️ Applied Skills & Rules

*   **Loaded Skills:**
    *   `[Skill Name]`: Used for [Action / File Ref].
    *   `[Skill Name]`: Followed to [Action / File Ref].
*   **Rule Validation Checks:**
    *   [x] Visual check: Spacing and contrast compliance (if UI).
    *   [x] Database check: Row Level Security (RLS) validation (if DB).
    *   [x] Git check: Staging and local commits checked.
```

## 📚 Mandatory Skill Ingestion & Search Protocol
Before proposing or making any changes to files in this repository, the agent **MUST** execute the following steps:
1. **Analyze Relevant Skills**: Review the available workspace-scoped skills in `.agents/skills/`.
2. **Read the Skill Files**: For any skill relevant to the task (e.g. `vercel-react-best-practices` for React/state, `ui-ux-pro-max` for UI layout/contrast/accessibility), the agent **MUST** run the `view_file` tool on the `.agents/skills/<skill-name>/SKILL.md` file to load instructions.
3. **Execute Search Scripts**: For styling, component interactions, or animations, the agent **MUST** query the design CLI search tool:
   `python .agents/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --domain <domain>` or `--stack <stack>`
   and analyze the output.
4. **Enforce Guidelines Over Default Knowledge**: Rely strictly on the rules retrieved from the skill files and search scripts instead of using default generic pre-trained styles, layouts, or state handling patterns.

## ✍️ Automatic Dual-Prompt Optimization Trigger
Whenever the user asks to write, generate, enhance, optimize, or format a prompt, or starts a query about creating/modifying a prompt (including spelling variations like "prmpt"):
1. The agent **MUST** automatically chain-load both the global `prompt-master` skill ([SKILL.md](file:///C:/Users/janak/.gemini/config/skills/prompt-master/SKILL.md)) and the workspace `enhance-prompt` skill ([SKILL.md](file:///c:/Users/janak/Downloads/_Projects/clipboard%20pro%20version/.agents/skills/enhance-prompt/SKILL.md)).
2. First, execute the `prompt-master` protocol to extract the 9 dimensions of intent, constraints, and target tool instructions.
3. Second, execute the `enhance-prompt` protocol to enrich the visual elements, UI components, platform-specific parameters, and layout templates.
4. Output a single, high-fidelity, optimized prompt block that combines the strengths of both skills.

