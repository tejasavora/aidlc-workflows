# Database Operations Patterns

## Connection Pool Sizing
- Formula: pool_size = (cpu_cores * 2) + effective_spindle_count
- For SSDs: pool_size = cpu_cores * 4 (higher parallelism)
- Application pool <= database max_connections (leave headroom for admin)
- Monitor: pool utilization alarm at 80%, connection wait time alarm at 100ms

## Connection Health
- Validation query on borrow (SELECT 1) — adds ~1ms but prevents stale connection errors
- Idle timeout: close connections idle > 10 minutes (prevent server-side timeout surprise)
- Leak detection: alert if connection not returned within 30s of borrow
- Max lifetime: recycle connections after 30 minutes (handle DNS changes, failover)

## Query Performance
- Slow query log threshold: 1 second (log), 5 seconds (alert)
- Query plan monitoring: detect plan regressions after schema changes
- Missing index detection: queries with sequential scans on large tables
- N+1 detection: high query count per request (>10 queries = review)

## Replication
- Lag monitoring: alarm at 5s (warning), 30s (critical)
- Read routing: direct reads to replica only if lag < tolerance for that query
- Failover automation: promote replica if primary unhealthy for > 30s
- Post-failover: verify data consistency, reconnect all application pools

## Maintenance
- PostgreSQL: autovacuum tuning (maintenance_work_mem, autovacuum_naptime)
- Index bloat: pg_stat_user_indexes → detect dead tuples ratio > 20%
- Statistics: ANALYZE after bulk loads (optimizer needs fresh stats)
- Storage: auto-scaling enabled, alarm at 80% capacity
- Backup: automated daily with PITR enabled, monthly restore test

## Failover Testing
- Scheduled monthly: trigger RDS failover, measure total downtime
- Application reconnect: verify connection pool refreshes within 30s
- No data loss: compare last committed transaction before/after failover
