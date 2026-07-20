# Container Orchestration Patterns

## Probes (Kubernetes / ECS Health Checks)
- **Liveness:** Simple (TCP or HTTP /healthz). Checks: "is the process stuck?" Failure = restart.
  Do NOT check dependencies (database, cache) — a database outage should not restart all pods.
- **Readiness:** Dependency-aware (HTTP /ready). Checks: "can I serve traffic?" Failure = remove from LB.
  Check: database connected, cache reachable, required config loaded.
- **Startup:** Generous timeout for slow-starting apps. initialDelaySeconds = max boot time.
  Prevents liveness probe from killing pods that haven't finished starting.

## Resource Management
- **Requests (guaranteed):** Set to actual steady-state usage (cpu: 100m, memory: 256Mi)
- **Limits (burst ceiling):** Set to 2-3x requests for burst headroom (cpu: 500m, memory: 512Mi)
- CPU limit: consider NOT setting (throttling hurts latency); use requests only for scheduling
- Memory limit: always set (OOMKill is better than node instability)

## Pod Disruption Budgets
- minAvailable: N-1 for small services (always keep at least 1 running during rollout)
- maxUnavailable: 25% for large deployments (roll faster but maintain capacity)
- Required for any service with SLA > 99.9%

## Auto-Scaling
- HPA: scale on CPU (80% target) + custom metrics (request rate, queue depth)
- VPA: recommendations only mode first, then auto-apply after confidence
- Cluster Autoscaler: scale-down delay 10m (prevent flapping)
- Scale-to-zero: only for batch/async workloads, not user-facing services

## Graceful Shutdown
- Pre-stop hook: `sleep 5` (allow LB to drain connections)
- SIGTERM handler: stop accepting → finish in-flight (30s grace) → exit 0
- terminationGracePeriodSeconds: 35s (5s pre-stop + 30s drain)

## Spot/Fargate
- Spot interruption handler: drain on 2-minute warning, reschedule
- Fargate Spot: only for fault-tolerant workloads (batch, async)
- Mixed instance policy: base on-demand + burst on spot

## Network Policies
- Default deny all ingress + egress (namespace-level)
- Explicit allow per service-to-service communication
- Allow egress to: kube-dns, required AWS endpoints (via VPC endpoints)
