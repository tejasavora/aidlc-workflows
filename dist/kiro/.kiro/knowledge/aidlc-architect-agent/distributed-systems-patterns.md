# Distributed Systems Patterns

## Distributed Tracing
- W3C Trace Context: propagate traceparent header across all service calls
- Sampling: head-based (decide at ingress, propagate decision) for simplicity
- Tail-based sampling: keep all traces for errors/slow requests, sample normal
- Instrumentation: auto-instrument HTTP clients, DB drivers, queue consumers
- Correlation: trace_id links all spans, span_id links parent-child

## Optimistic Concurrency
- Version field on every mutable entity (integer or timestamp)
- Read: return entity with version
- Write: SET ... WHERE id = ? AND version = ?. If 0 rows affected → 409 Conflict
- Client retries: read fresh → re-apply change → retry write
- Prevents lost updates without pessimistic locks (no deadlock risk)

## Distributed Locks
- Redis SETNX with TTL: acquire = SET key value NX EX 30
- Fencing token: include monotonic token with lock, reject operations with stale token
- DO NOT use for consensus (Redlock is flawed for critical paths — use proper consensus)
- Use for: leader election, cron job deduplication, resource reservation
- Always set TTL (prevent deadlock from crashed holder)

## Saga Pattern
- **Choreography:** Each service publishes event → next service reacts. Simple but hard to trace.
- **Orchestration:** Central coordinator calls each service in sequence. Complex but traceable.
- Compensation: for each step, define the undo action (create order → cancel order)
- Timeout: if step doesn't complete within threshold → trigger compensation for all prior steps
- Idempotent steps: compensation may run multiple times (must be safe to retry)

## Event Sourcing
- Append-only event store: never update/delete events
- Current state = replay all events (or read from snapshot + events since snapshot)
- Projections: read models built from events (can be rebuilt anytime)
- Snapshots: periodic state capture to avoid replaying all history (every 100 events)
- Schema evolution: event upcasters transform old event formats to current schema

## Idempotency in Workflows
- Deduplication key: client-generated ID that uniquely identifies the logical operation
- Result cache: store outcome keyed by dedup ID (return cached result on retry)
- Transactional outbox: write event + state in same transaction, separate poller publishes
- At-least-once delivery + idempotent consumer = effectively exactly-once processing

## CRDT (Conflict-free Replicated Data Types)
- G-Counter: increment-only counter (each node has own counter, merge = max per node)
- PN-Counter: increment + decrement (two G-Counters)
- OR-Set: add/remove with unique tags (observed-remove semantics)
- Use when: multi-region writes without coordination, eventual consistency acceptable
- Limitation: not suitable for invariant enforcement (balance >= 0)
