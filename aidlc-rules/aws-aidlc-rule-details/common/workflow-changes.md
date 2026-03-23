# Mid-Workflow Changes

## Change Types and Handling

### 1. Add a Skipped Stage
1. Confirm request and check prerequisite stages are complete
2. Add stage to `execution-plan.md`, mark "PENDING" in `aidlc-state.md`
3. Execute stage normally; log in `audit.md`
4. Review if later stages need updates from new artifacts

### 2. Skip a Planned Stage
1. Warn about missing artifacts and downstream consequences
2. Get explicit confirmation — user accepts responsibility
3. Mark "SKIPPED" in `aidlc-state.md` and `execution-plan.md`; log in `audit.md`
4. Note: can be added back later if needed

### 3. Restart Current Stage
1. Understand the concern — offer: (A) modify existing artifacts, (B) full restart
2. If restart: archive artifacts as `{artifact}.backup.{timestamp}`
3. Reset checkboxes in plan file, mark "IN PROGRESS" in `aidlc-state.md`
4. Re-execute from beginning; log reason

### 4. Restart Previous Stage
1. Identify all dependent stages that must also be redone
2. Warn user of full cascade: "Restarting [Stage] requires redoing: [list]"
3. Get explicit confirmation
4. Archive all affected artifacts, reset all affected stages, return to target stage
5. Consider if modification is better than full restart

### 5. Change Stage Depth
- Confirm new depth level and timeline impact
- Update in `workflow-planning.md`; can only change before or during stage, not after
- More depth = more time + better quality; less depth = faster + may miss details

### 6. Pause and Resume
**Pause**: Complete current step if possible, update all checkboxes and `aidlc-state.md`, log pause point.

**Resume**:
1. Detect `aidlc-state.md`, load all completed stage artifacts
2. Display current stage and next step
3. Offer: continue where left off or review previous work

### 7. Change Architecture Decision (monolith/microservices)
- Before Units Planning: minimal impact, update decision
- After Units Planning: must redo Units Planning/Generation and all per-unit design
- After Code Generation: significant rework — evaluate cost vs. benefit
- Get confirmation with full scope understanding

### 8. Add/Remove/Split Units
1. Assess which units have completed design/code
2. Update `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`
3. Mark affected units for redesign; execute normal design/code process
4. Adding: full design+code for new unit. Removing: redistribute functionality. Splitting: redo both.

## General Rules

### Before Changes
- Understand request and assess impact on all stages/artifacts/dependencies
- Explain consequences clearly; offer alternatives when modification beats restart
- Get explicit confirmation before any destructive changes

### During Changes
- Archive before destructive changes
- Keep `aidlc-state.md`, plan files, and `audit.md` in sync
- Validate changes are consistent across all artifacts

### After Changes
- Verify all artifacts align with changes
- Confirm changes meet user expectations
- Resume normal workflow execution

## Decision Tree

```
User requests change
├─ Current stage? → Modify or restart current stage
├─ Completed stage? → Assess dependent stage impact
│   ├─ Low impact → Modify and update dependents
│   └─ High impact → Restart from that stage
├─ Add skipped stage? → Check prerequisites, add, execute
├─ Skip planned stage? → Warn impact, confirm, skip
└─ Change depth? → Update plan, adjust approach
```
