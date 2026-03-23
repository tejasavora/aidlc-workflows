# Workflow Planning

**Purpose**: Determine which phases to execute and create the execution plan.
**Always executes** after requirements and scope are understood.

## Step 1: Load All Prior Context

- **Brownfield artifacts** (if applicable): architecture.md, component-inventory.md, technology-stack.md, dependencies.md
- **Requirements**: requirements.md, requirement-verification-questions.md (with answers)
- **User Stories** (if executed): stories.md, personas.md

## Step 2: Scope and Impact Analysis

### 2.1 Transformation Scope (Brownfield Only)

Analyze:
- Single component change vs architectural transformation
- Infrastructure vs application changes
- Deployment model changes (Lambda to Container, EC2 to Serverless, etc.)
- Related infrastructure: CDK stacks, API Gateway, load balancers, networking, monitoring
- Cross-package impact: shared models, client libraries, test packages

### 2.2 Change Impact Assessment

Evaluate each area (Yes/No + description):
- **User-facing**: UX changes?
- **Structural**: Architecture changes?
- **Data model**: Schema/data structure changes?
- **API**: Interface/contract changes?
- **NFR**: Performance, security, scalability impact?

Layer-specific impacts to assess:
- **Application**: Code changes, dependencies, configuration, testing
- **Infrastructure**: Deployment model, networking, storage, scaling
- **Operations**: Monitoring, logging, alerting, CI/CD pipeline

### 2.3 Component Relationships (Brownfield Only)

Map: Primary Component, Infrastructure Components, Shared Components, Dependent Components, Supporting Components. For each, note Change Type (Major/Minor/Config-only), Reason, and Priority (Critical/Important/Optional).

### 2.4 Risk Assessment

- **Low**: Isolated change, easy rollback, well-understood
- **Medium**: Multiple components, moderate rollback, some unknowns
- **High**: System-wide impact, complex rollback, significant unknowns
- **Critical**: Production-critical, difficult rollback, high uncertainty

## Step 3: Phase Determination

### User Stories — Execute IF:
Multiple user personas, UX impact, acceptance criteria needed, team collaboration required.
**Skip IF**: Internal refactoring, bug fix, tech debt, infrastructure changes.

### Application Design — Execute IF:
New components/services needed, methods/business rules need definition, service layer design required, component dependencies need clarification.
**Skip IF**: Changes within existing boundaries, no new components/methods, pure implementation.

### Design (Units Planning/Generation) — Execute IF:
New data models, API changes, complex algorithms, state management changes, multiple packages affected, IaC updates needed.
**Skip IF**: Simple logic changes, UI-only, config updates, straightforward implementations.

### NFR Implementation — Execute IF:
Performance, security, scalability, or monitoring requirements.
**Skip IF**: Existing NFR setup sufficient, no new NFR requirements.

## Step 4: Assign Depth Levels

See [depth-levels.md](../common/depth-levels.md). For each executing stage:
- **Minimal** — Simple/low-risk, defaults suffice
- **Standard** — Production-grade projects (default)
- **Comprehensive** — High-risk or critical areas

**MANDATORY**: Include depth in execution plan: `[Stage Name] - EXECUTE (depth: Standard)`

## Step 5: Multi-Module Coordination (Brownfield Only)

IF multiple modules/packages:
1. Analyze build-time vs runtime dependencies, API contracts, shared interfaces
2. Determine: update sequence, parallelization opportunities, coordination requirements, testing strategy, rollback strategy
3. Document module update strategy: approach (Sequential/Parallel/Hybrid), critical path, coordination points, testing checkpoints

## Step 6: Generate Workflow Visualization

Create Mermaid flowchart showing all phases with EXECUTE/SKIP status.

**Styling**:
- Always-execute/completed: `fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff`
- Conditional EXECUTE: `fill:#FFA726,stroke:#E65100,stroke-width:3px,stroke-dasharray: 5 5,color:#000`
- Conditional SKIP: `fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000`
- Start/End: `fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000`
- Phase containers: INCEPTION #BBDEFB, CONSTRUCTION #C8E6C9, OPERATIONS #FFF59D

## Step 7: Create Execution Plan Document

Create `aidlc-docs/inception/plans/execution-plan.md` with:

1. **Analysis Summary**: Transformation scope (brownfield), change impact assessment, component relationships, risk assessment
2. **Workflow Visualization**: Mermaid flowchart with status per stage
3. **Phases to Execute**: For each stage — EXECUTE (with depth) or SKIP with rationale
4. **Package Change Sequence** (brownfield only)
5. **Estimated Timeline**: Total phases, duration estimate
6. **Success Criteria**: Primary goal, key deliverables, quality gates

## Step 8: Initialize State Tracking

Update `aidlc-docs/aidlc-state.md` with:
- Project type, start date, current stage
- Execution plan summary (total stages, execute list, skip list with reasons)
- Stage progress checklist for all three phases
- Current status: lifecycle phase, current stage, next stage

## Step 9: Present Plan to User

Present summary including:
- Basis for plan (request, existing system, requirements, stories)
- Risk level and impact summary
- Stages to execute with rationale
- Stages to skip with rationale
- Package update sequence (brownfield)
- Estimated timeline

End with:
> **REVIEW REQUIRED**: Examine `aidlc-docs/inception/plans/execution-plan.md`
>
> **Options**: Request changes to execution plan | Approve and proceed to [Next Stage]

## Step 10: Handle User Response

- **Approved**: Proceed to next stage
- **Changes requested**: Update execution plan and re-confirm
- **Force include/exclude**: Update plan accordingly

## Step 11: Log Interaction

Log in `aidlc-docs/audit.md`: timestamp, AI prompt, user's complete raw response, status (Approved/Changes Requested), context.
