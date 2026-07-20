# Compliance Automation Patterns

## Change Control Evidence
- Every deployment automatically linked to: PR/CR number, approver, test results
- Pipeline emits structured events: DEPLOY_STARTED, DEPLOY_COMPLETED, ROLLBACK_TRIGGERED
- Map events to controls: CC7.1 (System Operations) ← deploy events with approver identity

## Audit Trail Completeness
- Every state mutation logged: actor (who), action (what), target (which resource), timestamp, before/after
- Immutable storage: CloudWatch Logs with retention lock, or S3 with Object Lock (WORM)
- Tamper detection: log file hashing (CloudTrail digest files)
- Coverage verification: compare "list of mutable operations" against "audit log entries" — gaps = findings

## SOC2 Control Mapping
| Control | Evidence Source | Automation |
|---------|---------------|-----------|
| CC6.1 Logical Access | IAM policies | access-control-review stage output |
| CC6.2 Access Removal | CloudTrail UserDeleted events | automated report |
| CC7.1 Change Management | Pipeline deploy events with approval | CI/CD audit log |
| CC7.2 Monitoring | CloudWatch alarm state history | observability-setup artifacts |
| CC8.1 Incident Management | Incident timeline from PagerDuty/OpsGenie | incident-response artifacts |

## HIPAA Minimum Necessary
- Log every access to PHI tables (DynamoDB Stream or RDS Audit Log)
- Justify: each access tied to a user action (not batch dump)
- Alert: access patterns deviating from normal (anomaly detection)
- BAA: verify Business Associate Agreement with every third-party touching PHI

## Evidence Freshness
- Evidence older than the control period (typically 12 months) is stale = finding
- Automated evidence refresh: re-collect monthly (not just at audit time)
- Dashboard: evidence age per control, red if approaching staleness

## Privacy Impact Assessment
- Trigger: new feature handling personal data, new third-party integration, new data flow
- Template: data type → processing purpose → legal basis → retention → access controls → risk → mitigation
- Store alongside design artifacts (aidlc-docs/) for traceability
