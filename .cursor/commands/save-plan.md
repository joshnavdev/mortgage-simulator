<!-- DC-MANAGED — do not edit. See .cursor/config-repo/ for customizations. -->

---
description: Save or update the current conversation's plan to .cursor/plans/
universal: true
---

# Save Plan

Extract the plan from this conversation and save it to `.cursor/plans/`.

## Instructions

1. **Check for existing plan**: Look in `.cursor/plans/` for a file matching the current topic (by ticket ID, slug, or subject). If one exists, UPDATE it in place — do not create a duplicate.

2. **Extract the plan**: Gather all planning content from this conversation:
   - Implementation steps
   - Architecture decisions
   - File lists (modify + create)
   - Open questions
   - Todo items with statuses

3. **Format**: Use the YAML frontmatter + markdown format defined in the `plan-persistence` rule. Include:
   - `name`, `ticket` (if applicable), `created`, `updated`, `overview`
   - `todos` array with `id`, `content`, `status`
   - Full markdown body with sections

4. **Preserve history**: If updating an existing file, preserve all previous content. Add new sections below, update todo statuses, and add a revision history entry.

5. **Confirm**: Tell me the filename and a one-line summary of what was saved/updated.
