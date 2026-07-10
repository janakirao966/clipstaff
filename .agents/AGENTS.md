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
