# API Production Patterns

## Idempotency
- Require `Idempotency-Key` header on all mutation endpoints (POST, PUT, PATCH)
- Server stores: key → response for 24h (return cached response on duplicate)
- Client generates UUID v4 per logical operation (retry uses same key)
- 409 Conflict if key reused with different body (not silent ignore)

## Pagination
- Cursor-based for large/changing datasets (encode last item ID, not offset)
- Offset-based acceptable for small, static datasets only
- Always enforce a maximum page size (default: 20, max: 100)
- Return: items[], next_cursor (null if last page), total_count (optional, expensive for large sets)

## Rate Limiting
- Per-client (identified by API key or JWT sub, IP as fallback)
- Sliding window algorithm (smooths burst compared to fixed window)
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- 429 response with Retry-After header (seconds until next allowed request)
- Different limits per endpoint tier (auth: strict, read: generous, write: moderate)

## Request Validation
- Body size limit: 413 Payload Too Large (default: 1MB for APIs, 10MB for file upload)
- Content-Type enforcement: reject if doesn't match expected (prevent content-type confusion)
- Schema validation at boundary (Zod, Joi, Pydantic) — fail fast with helpful error
- Reject unknown fields (strict mode) or document that they're ignored

## Long-Running Operations
- Return 202 Accepted immediately with Location header pointing to status endpoint
- Status endpoint: GET /operations/{id} → {status: pending|running|completed|failed, result?: {...}}
- Client polls (with Retry-After guidance) or uses webhook callback
- Timeout: if operation exceeds max duration, mark as failed with timeout reason

## Batch/Bulk Operations
- Accept array of items, process independently, return per-item status
- Partial success is valid (200 with mixed item statuses, not 500 for one failure)
- Maximum batch size enforced (400 if exceeded)
- Async for large batches (return 202, notify on completion)

## Compression
- Accept-Encoding: gzip, br (Brotli for text, gzip as fallback)
- Compress responses > 1KB (below this, compression overhead exceeds benefit)
- Content-Encoding header in response

## Webhooks
- Sign payloads with HMAC-SHA256 (shared secret per subscriber)
- Include timestamp in signature to prevent replay attacks
- Retry with exponential backoff: 1s, 5s, 30s, 5m, 30m, 2h (then give up)
- Delivery log: track each attempt, response code, latency
- Allow subscriber to verify: provide /webhook/verify endpoint

## Caching
- ETags on GET responses (hash of response body or version field)
- If-None-Match: return 304 Not Modified (saves bandwidth, not compute)
- Cache-Control headers: public/private, max-age, stale-while-revalidate
- Vary header: when response depends on Accept, Authorization, etc.
