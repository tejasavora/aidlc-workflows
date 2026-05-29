# Cost Estimation — Validation Spec

## Pass Criteria

- Human was asked for budget before estimation when absent from toolchain.yaml
- Cost breakdown exists per service (not a single total number)
- HA/DR premium is included if ha-design or dr-design artifacts exist
- Budget comparison is explicit (estimate vs. budget, delta, status)
- Optimization suggestions exist if estimate is within 20% of budget or over budget
- Human reviewed the estimate and their decision is recorded
- Both `cost-estimate.md` and `cost-estimate.yaml` exist at expected paths

## Fail Criteria

- Budget was assumed as "unlimited" without asking the human
- Cost estimate is a single number without per-service breakdown
- HA or DR redundancy costs are not reflected in the estimate when those designs exist
- No optimization suggestions when estimate exceeds budget
- Human was not shown the estimate for approval before workflow continued
- `cost-estimate.yaml` is missing (only markdown produced)

## Validation Steps

1. Verify `aidlc-docs/<intent>/construction/well-architected/cost-estimate.md` exists
2. Verify `aidlc-docs/<intent>/construction/well-architected/cost-estimate.yaml` exists
3. Read `cost-estimate.md` and confirm it contains a per-service breakdown table
4. Verify the total includes HA and DR premiums if those design artifacts exist
5. Verify budget vs. estimate comparison is present with explicit over/under status
6. If estimate > budget: confirm optimization suggestions are present with estimated savings
7. Verify audit trail records the human's budget decision (accept / optimize / adjust scope)
8. Confirm pricing region is stated in the estimate (cost varies by region)
