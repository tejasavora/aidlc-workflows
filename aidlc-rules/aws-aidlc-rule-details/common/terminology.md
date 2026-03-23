# AI-DLC Terminology

## Phase vs Stage
- **Phase** — High-level lifecycle grouping: INCEPTION (planning), CONSTRUCTION (implementation), OPERATIONS (deployment)
- **Stage** — Individual workflow activity within a phase (e.g., Requirements Analysis, Code Planning)
- Stages are ALWAYS-EXECUTE or CONDITIONAL

## Three Phases
- **INCEPTION** (`inception/`) — WHAT and WHY. Outputs: requirements, stories, architecture, unit definitions
- **CONSTRUCTION** (`construction/`) — HOW. Outputs: design artifacts, NFR implementations, code, tests
- **OPERATIONS** (`operations/`) — DEPLOY and RUN. Outputs: build instructions, deployment guides, monitoring

## Always-Execute Stages
- **Workspace Detection** — Analyze workspace state and project type
- **Requirements Analysis** — Gather requirements (depth varies by complexity)
- **Workflow Planning** — Create execution plan for which phases to run
- **Code Planning** — Create detailed implementation plans
- **Code Generation** — Generate code from plans and prior artifacts
- **Build and Test** — Build all units and execute testing

## Conditional Stages
- **Reverse Engineering** — Analyze existing codebase (brownfield only)
- **User Stories** — Create stories and personas (Planning + Generation)
- **Application Design** — Design components, methods, business rules, services
- **Design** — Units Planning + Units Generation + per-unit design
- **Functional Design** — Technology-agnostic business logic design (per-unit)
- **NFR Requirements** — Determine NFRs and select tech stack (per-unit)
- **NFR Design** — Incorporate NFR patterns and logical components (per-unit)
- **Infrastructure Design** — Map to actual infrastructure services (per-unit)

## Architecture Terms
- **Unit of Work** — Logical grouping of user stories for development; used during planning/decomposition
- **Service** — Independently deployable component (microservices context)
- **Module** — Logical grouping within a service/monolith; not independently deployable
- **Component** — Reusable building block (class, function, package) within a service/module

## Application Design Terms
- **Component** — Functional unit with specific responsibilities
- **Method** — Operation within a component with defined business rules
- **Business Rule** — Logic governing method behavior and validation
- **Service** — Orchestration layer coordinating business logic across components
- **Component Dependency** — Relationship and communication pattern between components

## Stage Patterns
- **Planning** — Create plan with questions and checkboxes. **Generation** — Execute plan to create artifacts.
- Pairs: Story Planning/Generation, Units Planning/Generation, Code Planning/Generation

## Depth Levels
- **Minimal** — Quick execution for simple changes
- **Standard** — Normal depth for typical projects
- **Comprehensive** — Full depth for complex/high-risk projects

## Artifact Types
- **Plans** — Documents with checkboxes guiding execution (`aidlc-docs/plans/`)
- **Artifacts** — Generated outputs from plans (`aidlc-docs/` subdirectories)
- **State Files** — `aidlc-state.md` (workflow progress), `audit.md` (audit trail)

## Abbreviations
- **AI-DLC**: AI-Driven Development Life Cycle
- **NFR**: Non-Functional Requirements
- **UOW**: Unit of Work
