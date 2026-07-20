# Authentication Hardening Patterns

## OAuth 2.0 / OIDC
- Always use Authorization Code + PKCE (never implicit flow, never client credentials for user auth)
- Validate: signature, exp, nbf, aud (must match your client ID), iss (must match your IdP)
- Reject: alg=none, alg=HS256 with public key (algorithm confusion attack)
- Token storage: HttpOnly cookie (web), secure storage (mobile), never localStorage

## Refresh Token Rotation
- Issue new refresh token on every use (one-time use)
- Detect reuse: if old refresh token used → revoke entire token family (breach detected)
- Absolute lifetime: 30 days max (force re-authentication)
- Store refresh tokens server-side (revocation capability)

## Session Management
- Cookie flags: HttpOnly (no JS access), Secure (HTTPS only), SameSite=Lax (CSRF protection)
- Idle timeout: 30 minutes of inactivity → session invalidated
- Absolute timeout: 24 hours regardless of activity → force re-auth
- Session ID: high-entropy random (256-bit minimum), regenerate on privilege change
- Server-side session store: Redis/DynamoDB with TTL matching timeout

## MFA Enforcement
- TOTP (Time-based OTP): 30-second window, 1-step tolerance (clock skew)
- WebAuthn/FIDO2: preferred for phishing resistance (hardware key or biometric)
- Recovery codes: 10 single-use codes, stored hashed, shown once at setup
- Enforce MFA: on signup (optional), on sensitive operations (required), on new device (required)

## API Key Security
- Entropy: minimum 256-bit random (not sequential, not predictable)
- Scoped: each key has explicit permission set (read-only, write, admin)
- Rotation: support dual-key period (old + new both valid during rotation)
- Rate-limited per key: prevent abuse even with valid credentials
- Prefix: `sk_live_` / `sk_test_` to prevent environment confusion

## Brute Force Protection
- Rate limit /login: 5 attempts per minute per IP + per account
- Exponential backoff lockout: 1min → 5min → 15min → 1hr (not permanent)
- CAPTCHA after 3 failed attempts (hCaptcha, reCAPTCHA v3)
- Notify user on: failed login from new IP, successful login from new device
- Never reveal: whether email exists (use same response for valid/invalid)

## Credential Stuffing Defense
- Breached password detection: check against HaveIBeenPwned k-anonymity API on registration
- Device fingerprinting: flag logins from new device/location
- Impossible travel: alert if login from two distant locations within short time
- Bot detection: behavioral analysis (mouse movement, typing cadence for web)
