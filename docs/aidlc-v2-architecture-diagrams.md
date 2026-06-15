# AI-DLC Architecture Diagrams (V2 + V3 Unified Model)

---

## 1. V3 Unified Execution Model (Contract-First Continuous Loop)

```mermaid
graph TD
    subgraph SHAPE["Phase 1: SHAPE"]
        direction LR
        S1[Intent + Scope] --> S2[Requirements]
        S2 --> S3[Architecture]
        S3 --> S4[Units + Delivery Plan]
    end

    subgraph CONTRACT["Phase 2: CONTRACT"]
        direction LR
        C1[Acceptance Tests] --> C2[API Contract Tests]
        C2 --> C3[Integration Fixtures]
        C3 --> C4[Done Definition]
    end

    subgraph LOOP["Phase 3: BUILD-VERIFY-DEPLOY (per increment)"]
        direction TB
        L1[Generate One Function]
        L2{Contract Tests Pass?}
        L3[Deploy to Sandbox]
        L4{Runtime Healthy?}
        L5[Increment DONE]
        L6[Regenerate]
        L7[Diagnose + Fix]

        L1 --> L2
        L2 -->|Yes| L3
        L2 -->|No, attempt lt 3| L6
        L6 --> L1
        L3 --> L4
        L4 -->|Yes| L5
        L4 -->|No| L7
        L7 --> L3
    end

    subgraph HARDEN["Phase 4: HARDEN"]
        direction LR
        H1[Security] --> H2[Performance]
        H2 --> H3[Resilience]
        H3 --> H4[Governance]
        H4 --> H5[Readiness Review]
    end

    subgraph OPERATE["Phase 5: OPERATE"]
        direction LR
        O1[Promote to Prod] --> O2[Monitor]
        O2 --> O3[Maintain]
        O3 --> O4[Govern]
    end

    SHAPE --> CONTRACT
    CONTRACT --> LOOP
    LOOP --> HARDEN
    HARDEN --> OPERATE
    OPERATE -.->|Feedback| SHAPE
```

---

## 2. Trust Levels (Same Loop, Different Gates)

```mermaid
graph LR
    subgraph GATES["Gate Behavior Per Trust Level"]
        direction TB
        G1["L1 Workshop:<br/>Human approves EVERY checkpoint"]
        G2["L2 Guided:<br/>Human approves Shape + Contract<br/>Auto if tests pass"]
        G3["L3 Supervised:<br/>Auto if metrics pass threshold<br/>Escalate on failure"]
        G4["L4 Autonomous:<br/>Full auto<br/>Human on completion only"]
    end

    subgraph CHECKPOINTS["6 Universal Checkpoints"]
        direction TB
        CP1[Shape approved?]
        CP2[Contract correct?]
        CP3[Tests pass?]
        CP4[Deploy healthy?]
        CP5[Hardening pass?]
        CP6[Promote to prod?]
    end

    CHECKPOINTS --> GATES
```

| Checkpoint | L1 | L2 | L3 | L4 |
|:---:|:---:|:---:|:---:|:---:|
| Shape | Human | Human | Auto | Auto |
| Contract | Human | Human | Auto | Auto |
| Tests pass | Human sees | Auto | Auto | Auto |
| Deploy healthy | Human clicks | Auto | Auto | Auto |
| Hardening | Human | Human | Auto if pass | Auto if pass |
| Production | Human | Human | Human | Metric-gated |

---

## 3. Phase 3 Detail: Build-Verify-Deploy Loop

```mermaid
sequenceDiagram
    participant Plan as Delivery Plan
    participant Agent as Developer Agent
    participant Tests as Contract Tests
    participant Sandbox as Deployed Sandbox
    participant Human as Human (if L1-L2)

    loop For each increment in plan
        loop For each function in increment
            Agent->>Agent: Generate implementation
            Agent->>Tests: Run contract tests
            alt Tests PASS
                Agent->>Sandbox: Deploy increment
                Sandbox->>Sandbox: Health check
                alt Healthy
                    Agent->>Agent: Mark function DONE
                else Unhealthy
                    Agent->>Agent: Diagnose + fix config
                    Agent->>Sandbox: Redeploy
                end
            else Tests FAIL (attempt lt 3)
                Agent->>Agent: Regenerate from scratch
            else Tests FAIL (attempt = 3)
                Agent->>Human: Escalate
            end
        end
        Agent->>Human: Increment complete (if L1-L2 gate)
    end
```

---

## 4. V2 Stage Mapping to V3 Phases

```mermaid
graph TD
    subgraph V2_STAGES["V2: 72 Stages (linear)"]
        direction TB
        V2A[Ideation 7 + Inception 8 = 15 stages]
        V2B[Construction 21 stages]
        V2C[Operation 21 stages]
        V2D[Maintenance 4 + Governance 9 = 13 stages]
    end

    subgraph V3_PHASES["V3: 5 Phases (loop)"]
        direction TB
        V3A[SHAPE = activities from Ideation + Inception]
        V3B[CONTRACT = new phase, tests-before-code]
        V3C[BUILD-VERIFY-DEPLOY = Construction as tight loop]
        V3D[HARDEN = Security + Performance + Resilience checks]
        V3E[OPERATE = Operation + Maintenance + Governance]
    end

    V2A --> V3A
    V2B --> V3B
    V2B --> V3C
    V2C --> V3D
    V2C --> V3E
    V2D --> V3E
```

---

## 5. Execution Guarantees (Invariants)

```mermaid
graph TD
    subgraph GUARANTEES["8 Execution Invariants"]
        G1["G1: No unverified code reaches sandbox<br/>deployed code is a subset of tested code"]
        G2["G2: Sandbox always healthy<br/>rollback on failure, never left broken"]
        G3["G3: Contracts immutable during execution<br/>escalate rather than weaken"]
        G4["G4: No hallucination in critical paths<br/>MCP verify before generate"]
        G5["G5: Production requires human L1-L3<br/>only L4 can auto-promote"]
        G6["G6: Every decision auditable<br/>timestamp + actor + metrics + artifacts"]
        G7["G7: Bounded regeneration<br/>max 3 attempts then escalate"]
        G8["G8: Cost bounded<br/>configurable ceiling, clean stop"]
    end
```

---

## 6. Quality as Continuous Policies (Not Sequential Stages)

```mermaid
graph LR
    subgraph TRIGGER["On Every Code Change"]
        direction TB
        T1[Lint + Format]
        T2[Type Check]
        T3[SAST]
    end

    subgraph DEPLOY_TRIGGER["On Every Deploy"]
        direction TB
        D1[Container Scan]
        D2[Runtime Validation]
        D3[SCA Check]
    end

    subgraph INCREMENT_TRIGGER["On Increment Complete"]
        direction TB
        I1[Coverage Check]
        I2[Contract Test Suite]
        I3[Integration Test]
    end

    subgraph HARDEN_TRIGGER["Once - After All Increments"]
        direction TB
        H1[Full DAST]
        H2[Load Test]
        H3[Chaos Experiment]
        H4[DR Drill]
        H5[Compliance Evidence]
    end

    CODE[Code Change] --> TRIGGER
    CODE --> DEPLOY_TRIGGER
    CODE --> INCREMENT_TRIGGER
    SYSTEM[System Complete] --> HARDEN_TRIGGER
```

---

## 7. V2 Current: Full Stage Inventory (72 stages, 7 phases)

```mermaid
graph TD
    subgraph P0["Initialization (3)"]
        I1[workspace-scaffold]
        I2[workspace-detection]
        I3[state-init]
    end

    subgraph P1["Ideation (7)"]
        ID1B[intent-capture]
        ID2[market-research]
        ID3[feasibility]
        ID4[scope-definition]
        ID5[team-formation]
        ID6[rough-mockups]
        ID7[approval-handoff]
    end

    subgraph P2["Inception (8)"]
        IN1[reverse-engineering]
        IN2[practices-discovery]
        IN3[requirements-analysis]
        IN4[user-stories]
        IN5[refined-mockups]
        IN6[application-design]
        IN7[units-generation]
        IN8[delivery-planning]
    end

    subgraph P3["Construction (21)"]
        C1[functional-design]
        C2[nfr-requirements + nfr-design]
        C3[infrastructure-design]
        C4[code-generation]
        C5[build-and-test]
        C6[static-analysis + security-scan]
        C7[coverage + integration-verify]
        C8[frontend-verify + e2e + dast]
        C9[production-readiness-review]
        C10[data-migration + seeding]
        C11[ha-design + dr-design + cost]
        C12[ci-pipeline]
    end

    subgraph P4["Operation (21)"]
        O1[sandbox-provisioning + iac-execution]
        O2[deploy-pipeline + execution]
        O3[env-verify + runtime-validation]
        O4[runtime-fix-loop + canary]
        O5[observability + incident-response]
        O6[perf-validation + chaos + dr-validation]
        O7[drift + release + capacity-planning]
        O8[database-ops + on-call-ops]
        O9[feedback-optimization]
    end

    subgraph P5["Maintenance (4)"]
        M1[bug-triage]
        M2[dependency-update]
        M3[tech-debt-assessment]
        M4[postmortem]
    end

    subgraph P6["Governance (9)"]
        G1[dora-metrics]
        G2[compliance-evidence]
        G3[secrets-lifecycle]
        G4[data-privacy-compliance]
        G5[supply-chain-security]
        G6[access-control-review]
        G7[api-governance]
        G8[cost-governance]
        G9[change-management]
    end

    P0 --> P1 --> P2 --> P3 --> P4
    P4 -.-> P5
    P6 -.->|cross-cutting| P3
    P6 -.->|cross-cutting| P4
```

---

## 8. V3 Evolution Path (V2 to V3 in 5 Steps)

```mermaid
graph LR
    subgraph STEP1["Step 1: Now"]
        S1[Add CONTRACT phase<br/>Tests before code]
    end

    subgraph STEP2["Step 2: Near-term"]
        S2[Per-endpoint Bolts<br/>Finer granularity]
    end

    subgraph STEP3["Step 3: Medium-term"]
        S3[Continuous sandbox deploy<br/>Deploy each increment]
    end

    subgraph STEP4["Step 4: Later"]
        S4[Collapse design into contracts<br/>Specs become tests]
    end

    subgraph STEP5["Step 5: Target"]
        S5[Full V3 loop<br/>Contract-first continuous]
    end

    STEP1 --> STEP2 --> STEP3 --> STEP4 --> STEP5
```

---

## 9. Workshop Experience: V2 vs V3

```mermaid
graph TB
    subgraph V2_WORKSHOP["V2 Workshop (current)"]
        direction TB
        W1["Hour 1-2: Approve docs<br/>(requirements, stories)"]
        W2["Hour 3-4: Approve designs<br/>(architecture, units)"]
        W3["Hour 5: Wait for code gen<br/>(black box)"]
        W4["Hour 6: It compiles!<br/>(but half is broken)"]
    end

    subgraph V3_WORKSHOP["V3 Workshop (target)"]
        direction TB
        X1["Hour 1: Approve shape<br/>(what to build)"]
        X2["Hour 2: Review contracts<br/>(what done looks like)"]
        X3["Hour 3-5: Watch tests go green<br/>(click sandbox after each)"]
        X4["Hour 6: Use the product<br/>(fully working, deployed)"]
    end
```

---

## 10. Metrics Comparison

```mermaid
graph LR
    subgraph V2_METRICS["V2 Metrics"]
        direction TB
        VM1[First deploy: Hour 8+]
        VM2[Runtime pass: approx 60 pct]
        VM3[Human gates: approx 15]
        VM4[Context compactions: 5-10]
        VM5[Post-gen wiring: 2-4 hours]
    end

    subgraph V3_METRICS["V3 Metrics - Target"]
        direction TB
        TM1[First deploy: Hour 2]
        TM2[Runtime pass: approx 95 pct]
        TM3[Human gates: 3-6]
        TM4[Context compactions: 0-2]
        TM5[Post-gen wiring: approx 0]
    end
```

---

## 11. Multi-Agent Architecture (Unchanged V2 to V3)

```mermaid
graph TD
    subgraph ORCH["Orchestrator"]
        SKILL[Conductor]
    end

    subgraph AGENTS["11 Domain Agents"]
        PA[Product]
        DA[Design]
        DEL[Delivery]
        ARCH[Architect]
        AWS[AWS Platform]
        COMP[Compliance]
        SEC[DevSecOps]
        DEV[Developer]
        QA[Quality]
        PIPE[Pipeline Deploy]
        OPS[Operations]
    end

    SKILL --> PA
    SKILL --> DA
    SKILL --> DEL
    SKILL --> ARCH
    SKILL --> AWS
    SKILL --> COMP
    SKILL --> SEC
    SKILL --> DEV
    SKILL --> QA
    SKILL --> PIPE
    SKILL --> OPS
```

Agents are unchanged between V2 and V3. What changes is WHEN and HOW OFTEN they're invoked (V3: more frequently, finer granularity, per-function instead of per-stage).

---

## 12. Scope Grid Summary

| Scope | SHAPE | CONTRACT | BUILD Loop | HARDEN | OPERATE |
|:---:|:---:|:---:|:---:|:---:|:---:|
| Enterprise | Full (15 activities) | Full contracts | All increments | All hardening | Full ops |
| Feature | Focused (8) | Full contracts | All increments | All hardening | Full ops |
| MVP | Minimal (5) | Core contracts | All increments | Security only | Minimal ops |
| POC | Skip (1-2) | Smoke tests only | All increments | Skip | Skip |
| Bugfix | Skip | Regression test | Fix only | Security scan | Deploy |
| Workshop | Focused (8) | Full contracts | All increments | All hardening | Full ops |

---

## 13. Self-Improving Loop (Cross-Project Learning)

```mermaid
graph TD
    subgraph RUN_N["Run N"]
        R1[Execute Workflow]
        R2[Emit Telemetry]
        R3[Compute Summary]
        R4[Identify Issues]
        R5[Store Lessons]
    end

    subgraph RUN_N1["Run N+1"]
        L1[Load Lessons from Prior Runs]
        L2[Apply as Hard Constraints]
        L3[Execute with Prevention]
        L4[Measure: Did Lessons Help?]
    end

    R1 --> R2 --> R3 --> R4 --> R5
    R5 -->|methodology-improvement-log.jsonl| L1
    L1 --> L2 --> L3 --> L4
    L4 -->|New lessons| R5
```

The system gets BETTER with every run. Known pitfalls become constraints. Repeated mistakes become automated prevention.

---

## 14. Adversarial Verification (Try to Break It)

```mermaid
graph TD
    subgraph VERIFY["Standard Verification (does it work?)"]
        V1[Contract Tests Pass]
        V2[Runtime Healthy]
        V3[Coverage Met]
    end

    subgraph ADVERSARIAL["Adversarial Verification (can I break it?)"]
        A1[Fuzz Every Input<br/>oversized, wrong type, unicode, injection]
        A2[Race Conditions<br/>concurrent identical requests]
        A3[Resource Exhaustion<br/>connection leak, memory fill, CPU starve]
        A4[Dependency Failure<br/>DB down, API timeout, queue full]
        A5[Auth Boundary<br/>expired token, wrong tenant, privilege escalation]
        A6[User Abuse<br/>10MB upload, 1000 requests per second, automated scraping]
    end

    VERIFY -->|passes| ADVERSARIAL
    ADVERSARIAL -->|survives| PROD[Production Ready]
    ADVERSARIAL -->|breaks| FIX[Fix + Harden]
    FIX --> ADVERSARIAL
```

---

## 15. Three-Tier Observability Architecture

```mermaid
graph TD
    subgraph T1["Tier 1: Base Telemetry (per stage)"]
        direction LR
        B1[Duration]
        B2[Gate Outcome]
        B3[Findings Count]
        B4[Confidence Score]
        B5[Contract Pass Rate]
    end

    subgraph T2["Tier 2: Deep Observability (debugging)"]
        direction LR
        D1[Decision Trace - WHY]
        D2[Root Cause Chain]
        D3[Hallucination Detection]
        D4[Design Drift]
        D5[Token Efficiency]
        D6[Cross-Stage Coherence]
    end

    subgraph T3["Tier 3: Real-Time Events (dashboards)"]
        direction LR
        E1[30+ Event Types]
        E2[WebSocket Stream]
        E3[Mobile Push]
        E4[Slack Integration]
        E5[Analytics API]
    end

    subgraph CONSUMERS["Consumers"]
        direction LR
        C1[Web Dashboard]
        C2[Mobile App]
        C3[Slack Bot]
        C4[Analytics Platform]
        C5[Improvement Engine]
    end

    T1 --> T2 --> T3
    T3 --> CONSUMERS
```

---

## 16. Complete V3 Build Loop (with all capabilities)

```mermaid
graph TD
    LEARN[Load Cross-Project Lessons] --> SHAPE[Phase 1: SHAPE]
    SHAPE --> CONTRACT[Phase 2: CONTRACT]
    CONTRACT --> SANDBOX[Deploy Sandbox]

    subgraph LOOP["Phase 3: BUILD-VERIFY-DEPLOY (per function)"]
        GEN[Generate Function]
        TEST{Contract Pass?}
        DEPLOY[Deploy to Sandbox]
        RUNTIME{Runtime OK?}
        SYNC[Codebase Sync]
        NEXT[Next Function]
        REGEN[Regenerate]
        FIX[Fix + Redeploy]

        GEN --> TEST
        TEST -->|Pass| DEPLOY
        TEST -->|Fail| REGEN
        REGEN --> GEN
        DEPLOY --> RUNTIME
        RUNTIME -->|Healthy| SYNC
        SYNC --> NEXT
        NEXT --> GEN
        RUNTIME -->|Unhealthy| FIX
        FIX --> DEPLOY
    end

    SANDBOX --> LOOP

    LOOP --> ADV[Adversarial Verification<br/>Try to Break]
    ADV --> HARDEN[Phase 4: HARDEN<br/>Security + Perf + Chaos]
    HARDEN --> UJS[User Journey Simulation<br/>Real User Behavior]
    UJS --> OPERATE[Phase 5: OPERATE]
    OPERATE --> TELEMETRY[Emit Telemetry + Lessons]
    TELEMETRY -.->|feeds next run| LEARN

    subgraph CONTINUOUS["Continuous Policies (fire on every change)"]
        direction LR
        P1[Lint]
        P2[SAST]
        P3[Type Check]
        P4[Anti-Gaming]
        P5[Relevance Check]
    end

    LOOP -.-> CONTINUOUS
```

---

## 17. Final Stage Inventory (78 stages, 7 phases)

| Phase | Stages | Key Additions |
|:---:|:---:|:---|
| Initialization | 3 | Upstream (unchanged) |
| Ideation | 7 | Upstream (unchanged) |
| Inception | 8 | Upstream (unchanged) |
| Construction | 26 | +contract-gen, +sandbox-deploy, +codebase-sync, +adversarial, +static/security/coverage/integration/frontend/e2e/dast/backward/data/HA/DR/cost/production-readiness |
| Operation | 24 | +sandbox-provisioning, +iac-execution, +env-verify, +runtime-validation, +runtime-fix-loop, +canary, +chaos, +dr-validation, +drift, +release, +capacity, +database-ops, +on-call, +user-journey |
| Maintenance | 4 | bug-triage, dependency-update, tech-debt, postmortem |
| Governance | 11 | +dora, +compliance, +secrets, +privacy, +supply-chain, +access-control, +api-governance, +cost-governance, +change-mgmt, +workflow-telemetry |

**Total: 78 stages + 80 knowledge files + 3-tier observability + cross-project learning**
