---
name: create-skill-from-workflow
description: 'Turn a repeated workflow into a reusable VS Code agent skill. Use when extracting a step-by-step process, decision tree, and completion checks into a SKILL.md for a project or personal workflow.'
argument-hint: 'Describe the workflow, the goal, and the scope (project or personal) to turn it into a reusable skill.'
user-invocable: true
disable-model-invocation: false
---

# Create a Skill from a Workflow

## When to Use
- A multi-step process is repeated across tasks or debugging sessions
- A review checklist, implementation pattern, or workflow should be reusable
- You want to package a method into a `SKILL.md` for future agents or users
- A conversation reveals concrete steps, branching logic, and exit criteria

## Goal
Create a reusable skill that captures:
- the step-by-step process being followed
- key decision points and branching logic
- quality criteria or completion checks
- where the skill should live: project-scoped or personal-scoped

## Procedure

### 1. Extract the workflow
Review the conversation and identify the actual process being used. Capture:
- the task goal
- the ordered steps
- the conditions that change the path
- what counts as success or completion

### 2. Generalize it into a reusable pattern
Convert the conversation into a reusable workflow, not just one-off notes. Focus on:
- repeatable actions
- decision branches
- validations or checks before finishing
- expected deliverables

### 3. Decide scope
Choose the correct location:
- Project skill: use `.github/skills/<name>/SKILL.md`
- Personal skill: use `~/.copilot/skills/<name>/SKILL.md` or the equivalent personal customization folder

### 4. Draft the skill file
Create a `SKILL.md` with frontmatter and a clear body:

```yaml
---
name: skill-name
description: 'What the skill does and when to use it.'
argument-hint: 'Describe the task for this skill.'
user-invocable: true
---
```

Then include:
- `When to Use`
- `Goal` or `Outcome`
- `Procedure` with numbered steps
- `Decision Points` when branching matters
- `Quality Checks` or `Completion Criteria`
- `Examples` or sample prompts if useful

### 5. Validate the draft
Before finalizing, confirm:
- the folder name matches the `name` field
- the description is keyword-rich and discoverable
- the workflow is clear and actionable
- the skill is compact and readable
- the instructions are specific enough to be reused

### 6. Refine weak areas
If any part is ambiguous, tighten it by clarifying:
- the final output the skill should produce
- the desired audience or scope
- which steps are mandatory and which are conditional
- what signals indicate the skill task is complete

### 7. Finalize and summarize
Once the skill is saved, describe:
- what the skill produces
- when to use it
- suggested example prompts
- related customizations to build next

## Decision Points
- If the workflow is broad and team-shared, prefer a project-scoped skill
- If the workflow is personal and cross-project, prefer a user-level skill
- If the process is a one-off task, use a prompt instead of a skill
- If the workflow needs tool restrictions or specialized agent behavior, consider a custom agent instead

## Quality Criteria
A good skill should:
- be discoverable by keywords in `description`
- contain concrete procedural steps
- capture decision logic and branch conditions
- define what success looks like
- stay focused on one repeatable workflow

## Example Prompts
- `Turn this debugging workflow into a reusable skill for the project.`
- `Package our review process into a SKILL.md for future use.`
- `Create a skill that captures how we validate implementation quality before completion.`
- `Convert this multi-step workflow into a project-scoped agent skill.`

## Related Customizations to Create Next
- a project-level instruction file for always-on guidance
- a reusable prompt for a single task variant
- a custom agent for multi-stage, context-isolated workflows
- a hook for validation or formatting checks during agent execution
