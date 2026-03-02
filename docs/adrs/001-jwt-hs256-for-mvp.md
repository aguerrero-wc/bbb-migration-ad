# ADR-001: JWT HS256 for MVP

**Status:** Accepted
**Date:** 2026-03-01
**Decision makers:** Orchestrator (Agent 0)

## Context

The CLAUDE.md for Auth/Security specifies RS256 (asymmetric) JWT signing. However, the `.env` already has symmetric secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`), and the current architecture has a single backend service that both issues and validates tokens.

RS256 provides a cryptographic advantage when multiple services need to verify tokens using only the public key, without access to the signing private key. In a single-service architecture, this benefit is irrelevant — HS256 is simpler, faster, and equally secure when the secret is properly managed.

## Decision

Use **HS256 (HMAC-SHA256)** for JWT signing in Sprint 1 through Sprint 4.

- Access tokens: signed with `JWT_SECRET` using HS256
- Refresh tokens: **not JWTs** — opaque random tokens (crypto.randomBytes), stored as SHA-256 hashes in the `refresh_tokens` table
- Token expiry: access = 15 minutes (`JWT_ACCESS_EXPIRY`), refresh = 7 days (`JWT_REFRESH_EXPIRY`)

## Consequences

### Positive
- Simpler configuration: no RSA key pair generation or management
- Compatible with existing `.env` secrets
- Faster token verification (HMAC vs RSA)
- Fewer moving parts for MVP debugging

### Negative
- If a second service needs to verify tokens independently, it would need the full `JWT_SECRET` (which grants signing authority)
- Migration to RS256 required before Sprint 5 (legacy integration)

### Migration Plan (Sprint 5)
When integrating with the legacy myzonego.com platform, external services will need to verify our JWTs. At that point:
1. Generate RSA key pair (RS256)
2. Replace `JWT_SECRET` with `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`
3. Update JwtModule configuration
4. Re-issue all active tokens (force re-login)
5. Distribute public key to legacy service

## Alternatives Considered

1. **RS256 from day one** — Rejected: unnecessary complexity for single-service MVP, requires key management tooling not yet in place
2. **ES256 (ECDSA)** — Rejected: same asymmetric benefits/tradeoffs as RS256, smaller keys but no practical advantage for MVP
3. **No JWT (session cookies)** — Rejected: SPA architecture benefits from stateless tokens, and the legacy app already uses session cookies (would cause conflicts)
