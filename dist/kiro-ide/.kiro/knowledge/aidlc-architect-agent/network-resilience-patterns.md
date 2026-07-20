# Network Resilience Patterns

## DNS
- Failover records: low TTL (60s) during changes, raise to 300s after stabilization
- Route 53 health checks: HTTP/HTTPS with string match, 10s interval, 3 threshold
- Multi-value answer routing for client-side load balancing
- Latency-based routing for multi-region with failover

## CDN (CloudFront)
- Origin failover group: primary + secondary origin with configurable error codes (500, 502, 503, 504)
- Cache invalidation: path-based for deploys, versioned URLs for assets
- Custom error pages: serve static 503 from S3 during outages
- Origin shield: reduce origin load, single cache layer

## Rate Limiting
- Per-endpoint limits (login stricter than read endpoints)
- Per-client identification (API key, JWT sub, IP as fallback)
- Sliding window algorithm (smoother than fixed window)
- Return 429 with Retry-After header (not silent drop)
- WAF rate-based rules for DDoS at edge

## Load Balancer
- Health check: interval 10s, unhealthy threshold 3, healthy threshold 2
- Deregistration delay: 30s minimum (drain in-flight requests)
- Idle timeout: match backend timeout (avoid premature connection close)
- Cross-zone load balancing: enabled (distribute evenly across AZs)
- Target group stickiness: avoid unless stateful (prefer stateless)

## Backpressure
- Return 429 with Retry-After when overloaded (don't silently queue)
- Shed lowest-priority traffic first (batch jobs before interactive)
- Propagate backpressure upstream (don't buffer indefinitely)
- Circuit breaker at ingress: reject early rather than queue and timeout

## Connection Draining
- Pre-stop hook: sleep 5s (allow LB to stop sending traffic)
- Graceful shutdown: stop accepting → drain in-flight (30s timeout) → close
- Health check fails immediately on SIGTERM (LB stops routing)
