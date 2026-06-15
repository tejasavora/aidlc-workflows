# Graceful Degradation Patterns

## Dependency Degradation Matrix
Define per dependency what happens when it's unavailable:
| Dependency | Feature Impact | Degradation Action |
|-----------|---------------|-------------------|
| Database | Core CRUD | Serve from cache (stale), queue writes for replay |
| Cache (Redis) | Performance only | Bypass cache, serve from DB (slower but correct) |
| Search (ES) | Search feature | Disable search, show "temporarily unavailable" |
| External API | Enrichment | Return data without enrichment, flag as incomplete |
| Auth service | All authenticated | Use cached tokens (short grace period), then 503 |

## Feature Flags as Kill Switches
- Every non-critical feature behind a flag (LaunchDarkly, AppConfig, Evidently)
- Kill switch = instant off (no deployment required)
- Gradual rollout = percentage-based (1% → 10% → 50% → 100%)
- Segment-based: internal users first, then beta, then GA
- Stale flag cleanup: if flag is 100% for 30 days, remove flag and hardcode

## Graceful Shutdown Sequence
1. Receive SIGTERM
2. Stop accepting new connections (close listener, fail health check)
3. Wait for in-flight requests to complete (grace period: 30s)
4. Close database connections cleanly (release pool)
5. Flush buffers (logs, metrics, queues)
6. Exit 0

## Load Shedding
- Priority queues: premium > standard > batch > background
- When saturated: shed lowest priority first (reject batch jobs)
- Shed early: reject at ingress (LB / API Gateway) not deep in the stack
- Signal: return 503 with Retry-After (not timeout, which wastes client resources)

## Partial Failure Isolation (Bulkhead)
- Separate thread pools / connection pools per dependency
- Dependency A failure does not exhaust resources needed for Dependency B
- Example: HTTP client pool for payment service is isolated from catalog service pool
- Circuit breaker per dependency (not global)

## Circuit Breaker States
- **Closed (normal):** Requests flow through. Track failure rate.
- **Open (tripped):** All requests immediately fail (fast, no wait). Return cached/fallback.
- **Half-open (testing):** Allow ONE request through. If success → close. If fail → re-open.
- Thresholds: open when failure rate > 50% over 10s window. Half-open after 30s cooldown.
- Per-dependency configuration (payment service: sensitive, logging service: lenient)

## Traffic Management
- Weighted routing: 90% to primary, 10% to canary (progressive validation)
- Header-based routing: X-Feature-Flag → route to experimental backend
- Geographic routing: route to nearest region for latency
- Failover routing: if primary unhealthy → automatic switch to secondary
