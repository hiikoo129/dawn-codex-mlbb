# Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants
1. **Creator-Only Global Config**: Only the verified creator (`kintilasem129@gmail.com` with `email_verified == true` or an entry in `/admins/{uid}`) may create or update `/app_config/global`. Standard users can never alter app branding, season epoch, or shop prices.
2. **Owner-Isolated Private User State**: `/users/{userId}` documents are readable and writable only by `request.auth.uid == userId` (verified) or the admin. No blanket reads or cross-user scraping are permitted.
3. **PII-Free Public Leaderboard**: `/leaderboard/{userId}` stores only game display names, optional MLBB ID tags, rank stars, season points, and avatar URLs—never emails or auth metadata. Writes require `uid == request.auth.uid` (or admin for season reset).
4. **Strict Payload Keys & Bounds**: Every write validates required fields, forbids extra shadow keys (`hasOnly`), enforces string `.size()` limits, enforces `^[a-zA-Z0-9_\-]+$` on IDs, and requires `request.time` on `updatedAt`.

## 2. The "Dirty Dozen" Attack Payloads
1. Unauthenticated write to `/app_config/global` -> `PERMISSION_DENIED`.
2. Non-admin verified user updating `/app_config/global` `epicDiamondPrice` -> `PERMISSION_DENIED`.
3. Spoofed admin email with `email_verified: false` updating `/app_config/global` -> `PERMISSION_DENIED`.
4. Authenticated User A reading `/users/userB` -> `PERMISSION_DENIED`.
5. Authenticated User A listing `/users` collection -> `PERMISSION_DENIED`.
6. User A creating `/users/userA` with a shadow field `isAdmin: true` -> `PERMISSION_DENIED`.
7. User A creating `/users/userA` with `uid: "userB"` (Identity Spoofing) -> `PERMISSION_DENIED`.
8. User A updating `/users/userA` with `diamonds: -500` (Negative Currency Poisoning) -> `PERMISSION_DENIED`.
9. User A updating `/users/userA` with `ownedSkins` containing > 100 items -> `PERMISSION_DENIED`.
10. User A writing `/leaderboard/userB` (overwriting another player's rank) -> `PERMISSION_DENIED`.
11. User A writing `/leaderboard/userA` with `updatedAt` forged to a past client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
12. User A writing `/leaderboard/invalid$id!` with poisoned document ID -> `PERMISSION_DENIED`.
