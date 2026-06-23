# Caching Patterns

## Cache Warming
- After deploy: pre-populate hot keys (top 100 most-accessed entities)
- After failover: warm from backup replica or pre-computed list
- Lazy warming: first miss populates, but provision for cold-start latency spike
- Background refresh: TTL/2 trigger async refresh (never serve stale + never block)

## Stampede Protection
- Request coalescing: only ONE backend request per cache miss (others wait for result)
- Probabilistic early expiration: refresh at random(TTL * 0.8, TTL) to distribute renewals
- Lock-based: acquire short-lived lock on cache miss, others serve stale or wait
- Pre-computation: for critical keys, background job refreshes before TTL expires

## Invalidation Strategies
- **Event-driven:** Write publishes invalidation event → cache subscriber deletes key (strong consistency)
- **TTL-based:** Accept staleness within TTL window (simple, eventual consistency)
- **Hybrid:** Short TTL + event-driven invalidation for critical paths (belt and suspenders)
- Never use "invalidate everything" (cache flush = stampede)

## Cache Key Design
- Include version: `v2:user:{id}` (schema changes don't serve stale format)
- Include locale/tenant: `tenant:{tid}:product:{pid}` (isolation)
- Predictable format: enables bulk invalidation by prefix
- Hash long keys: if key > 250 chars, SHA256 the variable part

## Write Patterns
- **Cache-aside (read-through):** App checks cache → miss → read DB → write cache → return
- **Write-through:** Write to cache AND DB on every write (strong consistency, higher write latency)
- **Write-behind:** Write to cache immediately, async flush to DB (lowest latency, eventual consistency, data loss risk)
- Choose based on: consistency requirement × write frequency × acceptable loss risk

## TTL Guidelines
- Configuration data: 5-15 minutes (changes infrequently, stale is annoying not dangerous)
- User profile: 1-5 minutes (changes occasionally, stale is briefly confusing)
- Session data: match session timeout (30 minutes idle, 24h absolute)
- Real-time data (prices, availability): 0-30 seconds or event-invalidated
- Immutable data (historical records): cache forever (infinite TTL)

## Distributed Cache
- Redis Cluster: hash slots distribute keys (CRC16 mod 16384)
- Cross-AZ replication: async for reads, sync for critical writes
- Eviction policy: allkeys-lru for general cache, volatile-ttl for mixed use
- Memory alarm: > 80% used = alert, risk of eviction thrashing
