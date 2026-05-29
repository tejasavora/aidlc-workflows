# Notification — Validation Spec

## Pass Criteria

- Notification channels were configured (from toolchain.yaml or human clarification)
- Notification log exists with at least one entry
- Approval notifications were sent to the correct channel when approval was required
- Delivery failures were logged and retried (not silently dropped)
- Notification failures did not block the workflow

## Fail Criteria

- Approval was required but notification was not sent
- Notification log is missing (no evidence of what was sent)
- Webhook URLs or tokens are hardcoded in config (must reference secrets)
- Notification failure caused workflow to pause or abort

## Validation Steps

1. Verify `aidlc-docs/<intent>/integrations/notification-log.md` exists with at least one entry
2. For any approval event in the session: confirm a notification log entry exists for it
3. Verify toolchain.yaml notification credentials reference environment variables, not inline secrets
4. If any delivery failed: confirm retry was attempted and failure was logged
5. Confirm workflow continued despite any notification failures (non-blocking check)
