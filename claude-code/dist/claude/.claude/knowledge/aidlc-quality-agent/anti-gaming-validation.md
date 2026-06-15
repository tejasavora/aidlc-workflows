# Anti-Gaming Validation

Metrics can be gamed. Coverage can be inflated with trivial tests. Security scans can miss languages they don't support. "Healthy" health checks can return 200 while the app is broken. This file defines how to validate that metrics are MEANINGFUL, not just passing.

## Coverage Gaming Detection

Flag as GAMED if:
- Tests assert only non-null/non-undefined (no behavior verification)
- Tests duplicate the implementation logic (testing the code, not the behavior)
- Tests use `expect(true).toBe(true)` or equivalent tautologies
- Tests cover trivial code (getters, constructors) while ignoring business logic
- Coverage increases but contract test pass rate doesn't change (coverage without value)

**Meaningful coverage means:** Every test asserts a behavior defined in requirements or contracts. If you can delete the test and no requirement becomes unverifiable, the test is meaningless.

## Security Scan Gaming Detection

Flag as GAMED if:
- SAST tool doesn't support the project's language (e.g., Bandit on a TypeScript project)
- Scan runs against empty/stub files (not the actual implementation)
- Critical findings are suppressed with inline comments without justification
- Container scan runs against a minimal base image, not the built application image
- Dependencies are pinned to versions with known-clean scan but actual usage is different

**Meaningful security means:** Scan runs against ACTUAL generated code, in the ACTUAL language, with the ACTUAL dependencies installed.

## Runtime Health Gaming Detection

Flag as GAMED if:
- Health check always returns 200 (doesn't check any dependency)
- Health check checks database connectivity but not query correctness
- "All endpoints pass" but test data is hardcoded in test (not hitting real DB)
- Runtime validation uses the same mock data that code-generation used to write the code

**Meaningful health means:** Health check verifies the REAL dependency chain. Runtime validation uses REALISTIC data that exercises actual business logic, not just confirms the endpoint exists.

## Test Quality Validation

For each test file generated, verify:
- [ ] Test name describes a BEHAVIOR, not an implementation detail
- [ ] Test has at least one meaningful assertion (not just "no error thrown")
- [ ] Test uses realistic data (not "test123", "foo@bar.com", "asdf")
- [ ] Test would FAIL if the implementation were wrong (mutation testing principle)
- [ ] Test is independent (doesn't depend on other tests running first)

## Confidence Score Validation

The confidence score itself can be gamed (agent reports 0.9 when it should be 0.5). Validate by checking:
- If confidence = 1.0 but regeneration_attempts > 0 → INCONSISTENT
- If confidence > 0.8 but human_intervention occurred → SUSPECT
- If confidence > 0.9 but hallucination_detection.unverified > 0 → INFLATED
- If confidence > 0.8 but runtime_checks.endpoints_failed > 0 → GAMING

Cross-reference: stage confidence should correlate with downstream stage success. If stage A reports 0.95 confidence but stage B (which consumes A's output) fails immediately → A's confidence was inflated.

## How to Enforce

In production-readiness-review, add these checks:
1. Sample 5 random tests → verify each tests a REQUIREMENT (not just code mechanics)
2. Check that SAST tool matches project language
3. Verify health check actually queries a dependency (not just return 200)
4. Compare confidence scores against actual outcomes (calibration check)

If gaming detected: downgrade the readiness score and FLAG in telemetry as `metrics_gaming_detected: true`.
