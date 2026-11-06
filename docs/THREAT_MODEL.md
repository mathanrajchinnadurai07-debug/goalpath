# GoalPath Cybersecurity Threat Model & OWASP ASVS Audit (docs/THREAT_MODEL.md)

---

## 1. STRIDE Threat Model

| Threat | Target Asset | Attack Vector | Security Countermeasure Implemented |
|---|---|---|---|
| **Spoofing** | User Session / Identity | Credential stuffing, session hijacking, cookie sniffing | Argon2id password hashing, HttpOnly SameSite=Lax/Strict session cookies, rotating session tokens in database, optional TOTP 2FA. |
| **Tampering** | Goals, Milestones, Tasks | Insecure Direct Object Reference (IDOR), API parameter tampering | Strict tenant ownership check (`WHERE id = :id AND userId = :currentUserId`) on every single query. Zod schema validation on every payload. |
| **Repudiation** | Admin Actions / Account Deletions | Rogue administrator or user denying account changes | Append-only `AuditLog` table capturing timestamp, actor email, action code, resource, IP address, and user agent. |
| **Information Disclosure** | Private Goals & Gratitude Journals | Admin snooping, database leak, verbose stack traces | Zero-Knowledge admin console (admin queries explicitly exclude goals and gratitude tables). Production error masking. |
| **Denial of Service** | Authentication & API Routes | Rapid brute-force password guessing, resource starvation | In-memory sliding window rate limiter (`src/lib/rate-limit.ts`) blocking abusive IPs after 5 failed attempts with progressive lockouts. |
| **Elevation of Privilege** | User Profile Update | Mass assignment payload sending `role: "ADMIN"` | Server-side role assignment only; Zod validation schema omits `role` field from client update endpoints. |

---

## 2. OWASP ASVS Level 2 Verification Checklist

- [x] **V1: Architecture, Design and Threat Modeling**: Formal STRIDE threat model documented and implemented.
- [x] **V2: Authentication**: Passwords hashed with bcrypt/Argon2 (cost 12), length >= 8 characters with complexity rules, lockout after 5 consecutive failures.
- [x] **V3: Session Management**: Session tokens generated with `crypto.randomBytes(32)`, stored in database, delivered over HttpOnly, Secure, SameSite cookies.
- [x] **V4: Access Control (RBAC & IDOR)**: Explicit ownership verification on every database mutation. Role checking on `/api/v1/admin/*`.
- [x] **V5: Validation & Sanitization**: Strict input validation using Zod schemas on both client and server route handlers.
- [x] **V6: Cryptography**: TLS 1.3 enforced, RFC 6238 TOTP two-factor authentication, cryptographic backup codes.
- [x] **V7: Error Handling & Logging**: Generic error messages to clients; audit logging for security events (login failures, 2FA changes, data exports).
- [x] **V8: Data Protection**: GDPR Article 20 JSON/CSV data export and Article 17 full erasure endpoints implemented.
- [x] **V14: Configuration & Headers**: Strict CSP with default-src 'self', HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY.
