---
trigger: model_decision
description: "AI-DLC V2 quality-gates: contract-test"
---


# Contract Testing

Verify that services honour the contracts their consumers depend on. This is the proactive complement to `backward-compat` — instead of diffing specs, it runs live verification between a provider and its consumer contracts. Catches integration failures before they reach production.

## Activation Condition

Activates when BOTH conditions are true:
1. Multiple units exist in `aidlc-docs/<intent>/construction/` (single-unit projects have no inter-service contracts)
2. `api-contracts.md` is present for at least one unit

If only one unit exists, this skill is silently skipped.

## Inputs

- Human clarification (see Step 1)
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing.contract`:
  ```yaml
  contract:
    tool: pact               # pact | spring-cloud-contract | prism | custom
    broker_url: http://pact-broker:9292  # optional: Pact Broker URL
    contracts_dir: contracts/           # directory containing consumer contract files
    consumer_timeout: 30s
  ```
- `aidlc-docs/<intent>/construction/<unit>/api-contracts.md` for each unit
- Consumer contract files (Pact JSON files, Spring Cloud Contract stubs, OpenAPI examples)

## Execution

### Step 1: Human Clarification

Ask:
1. Which units are API consumers? (e.g., "checkout-service calls order-service and payment-service")
2. Where are the consumer contract files? (directory path, or Pact Broker URL)
3. Are contracts already written, or do they need to be generated from the api-contracts.md documents?

If contracts do not yet exist → offer to generate Pact consumer contracts from `api-contracts.md` before running verification. This requires human confirmation.

### Step 2: Locate or Generate Contracts

**If contracts exist:**
Locate all consumer contract files in `contracts_dir` or retrieve from Pact Broker:
```bash
# List contracts from Pact Broker
pact-broker list-latest-pact-versions --broker-base-url $PACT_BROKER_URL
```

**If contracts need generation from api-contracts.md:**
For each consumer unit, read its `api-contracts.md` and extract the endpoints it consumes. Generate minimal Pact consumer contracts:
```json
{
  "consumer": {"name": "checkout-service"},
  "provider": {"name": "order-service"},
  "interactions": [
    {
      "description": "a request for order details",
      "request": {"method": "GET", "path": "/orders/123"},
      "response": {
        "status": 200,
        "body": {"id": "123", "status": "CONFIRMED", "total": 49.99}
      }
    }
  ]
}
```

Present generated contracts to human for confirmation before running verification.

### Step 3: Run Provider Verification

For each consumer-provider pair, run the provider against the consumer's contract:

**Pact:**
```bash
# Provider verification — starts the provider service and replays consumer contracts
pact-provider-verifier --provider-base-url http://localhost:8080 \
  --pact-broker-base-url $PACT_BROKER_URL \
  --provider "order-service" \
  --publish-verification-results \
  --provider-app-version $GIT_COMMIT
```

**Spring Cloud Contract:**
```bash
./mvnw test -pl order-service -Dspring.cloud.contract.verifier.stubs.mode=REMOTE
```

**Prism (OpenAPI mock verification):**
```bash
prism proxy openapi.yaml http://localhost:8080 --validate-request --validate-response
# Run consumer integration tests against Prism proxy
```

**Custom:** read `contract.command` from toolchain.yaml and execute it.

If the tool is unfamiliar → invoke `knowledge-acquisition` meta-skill.

### Step 4: Diagnose Violations

For each failed verification, classify the root cause:

| Failure Type | Indicators | Self-Healing Action |
|---|---|---|
| **Provider code diverged from design** | Provider returns different fields than `functional-design` specifies | Fix provider code to match its functional design |
| **Consumer contract is stale** | Consumer contract requests a field that was never in the provider's design | Update consumer contract to match current design |
| **Design gap** | Neither consumer contract nor provider design covers this case | Escalate: new story needed |

### Step 5: Self-Healing — Fix Provider Code (Attempt 1)

If root cause is "provider code diverged from design":
1. Read the provider's `functional-design/` documents
2. Identify the divergence (e.g., response field renamed, type changed)
3. Fix the provider code to match the design
4. Re-run provider verification (Attempt 2)

Do NOT update the consumer contract to accommodate a broken provider — fix the provider.

### Step 6: Produce Contract Test Report

```markdown
## Contract Testing Report

**Date:** 2024-01-15T17:45:00Z
**Tool:** Pact 11.x
**Attempt:** 2 (self-healing applied)

### Consumer-Provider Pairs

| Consumer | Provider | Interactions | Status |
|---|---|---|---|
| checkout-service | order-service | 3 | PASS |
| checkout-service | payment-service | 2 | PASS |
| api-gateway | order-service | 1 | PASS (fixed) |

### Violations Fixed (self-healing)

#### api-gateway → order-service: GET /orders/{id}

- **Violation:** Response missing `created_at` field (contract expected it)
- **Root cause:** Provider code diverged from design — `functional-design/order.md §4.2` specifies `created_at` in the response
- **Fix:** Added `created_at` to `OrderResponseSerializer` (order-service/serializers.py:34)
- **Verification:** Re-run PASSED after fix

### All Contracts Verified
```

## Outputs

- `aidlc-docs/<intent>/quality/contract-test-report.md`
  - Pass/fail per consumer-provider pair
  - Violations diagnosed and self-healing applied (if any)
  - Any escalations (design gaps or consumer contract staleness requiring human decision)

## Artefact Verification

`artefact-verification: "true"` — Contract test results are presented to the human. Any violations that could not be auto-fixed (design gaps, stale consumer contracts) require human decision before construction proceeds.
