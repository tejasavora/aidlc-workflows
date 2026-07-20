# Queue and Messaging Patterns

## Dead Letter Queues
- Configure DLQ after N failed processing attempts (default: 3)
- DLQ alarm: any message in DLQ = alert (should be empty normally)
- DLQ consumer: log full message context for debugging, do not auto-retry from DLQ
- Poison message quarantine: messages that crash the consumer get isolated immediately

## Message Ordering
- SQS FIFO: use MessageGroupId for per-entity ordering (not global ordering)
- Kinesis: partition key determines shard (ordering within shard only)
- If ordering matters: design for per-entity streams, not global FIFO
- If ordering doesn't matter: use standard queues (higher throughput)

## Delivery Semantics
- At-least-once (default): consumer must be idempotent (deduplication key + result cache)
- Exactly-once (SQS FIFO + dedup): use MessageDeduplicationId, 5-minute dedup window
- Transactional outbox: write event + data in same DB transaction, poller publishes

## Consumer Patterns
- Batch processing: process N messages per poll (reduce API calls)
- Visibility timeout > max processing time (prevent duplicate delivery)
- Auto-scaling consumers based on queue depth (ApproximateNumberOfMessages metric)
- Consumer lag monitoring: ApproximateAgeOfOldestMessage alarm

## Event Schema Versioning
- Backward compatible: add optional fields only, never remove or rename
- Schema registry: validate events against schema before publish
- Version in event: `"version": "2"` for consumers to handle evolution
- Consumer tolerance: ignore unknown fields (forward compatibility)

## Backpressure
- Pull-based consumers (SQS long polling) naturally handle backpressure
- Push-based (SNS → Lambda): configure concurrency limit to prevent overwhelm
- Kinesis: enhanced fan-out for isolated consumer throughput
- Hot partition detection: monitor per-partition metrics, rebalance key distribution
