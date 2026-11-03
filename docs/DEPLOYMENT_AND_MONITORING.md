# 🚀 ParkShark — Production Deployment & Cloud Monitoring Guide

This guide walks you through deploying **ParkShark** to Firebase Hosting, Cloud Functions v2, and Cloud Firestore, along with setting up Firebase App Check, performance monitoring, and production alerting.

---

## 1. Prerequisites

1. **Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```
2. **Authenticate with Google Cloud / Firebase**:
   ```bash
   firebase login
   ```
3. **Select Active Project**:
   ```bash
   firebase use parkshark-vit
   # Or create a new one:
   firebase projects:create parkshark-vit
   ```

---

## 2. Hardened Architecture & Security Features

### A. Firestore Security Rules
All database access is strictly governed by [`firestore.rules`](../AEl0wwzRqWIYWHjt-grok-workspace/firestore.rules):
- **User Isolation**: Students can read and edit only their own profile document (`/users/{uid}`). Cross-student reading is rejected.
- **Stand Write Protection**: Direct client writes to `/stands/{standId}` are rejected for students; stand status transitions (locking, unlocking, maintenance) are strictly handled through backend Cloud Functions with the Admin SDK.
- **Atomic Session Guards**: Direct client writes to `/sessions` are blocked for students to prevent client-side timer manipulation.
- **Validated Incident Reports**: Filed complaints must contain valid category tokens (`lock_jammed`, `rack_damaged`, `qr_unreadable`, `app_issue`, `billing_issue`) and a `'pending'` status. Status transitions to `'resolved'` or `'closed'` are strictly reserved for campus administrators.
- **Pre-Registration Whitelist**: Protected admissions directory (`/preRegisteredStudents/{studentId}`) writable only by administrators.

### B. Cloud Functions Input Validation & Rate Limiting
- **Pattern Verification**: Every stand ID is strictly validated against `^AB[1-3]-(0[1-9]|[1-4][0-9]|50)$`.
- **Sliding Window Rate Limiter**: Per-user / per-IP rate limiting enforces a maximum of 5 locking transactions and 10 unlocking attempts per minute, thwarting automated script spamming.
- **Brute-Force Lockout**: 5 failed 4-digit PIN attempts trigger a 5-minute security lockout on the active session.

### C. Firebase App Check (Anti-Abuse)
To prevent unauthorized API access from curl, Postman, or rogue clients:
1. Navigate to **Firebase Console > App Check**.
2. Register your web app with **reCAPTCHA Enterprise** or **reCAPTCHA v3**.
3. Obtain your site key and enable enforcement for Cloud Functions and Firestore.
4. Set `ENFORCE_APP_CHECK=true` in your Cloud Functions environment configuration.

---

## 3. Deployment Steps

### Step 1: Build Frontend & Functions
```bash
# Navigate to workspace
cd AEl0wwzRqWIYWHjt-grok-workspace

# Run TypeScript checks and automated test suites (105 tests passing)
npm test
npm run typecheck

# Build Cloud Functions
cd functions
npm run build
cd ..

# Build Frontend Bundle
npm run build
```

### Step 2: Deploy Firestore Security Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Step 3: Deploy Cloud Functions v2
```bash
firebase deploy --only functions
```
Deploys:
- `lockBicycle`: Atomic transactional locking with SHA-256 salted PIN hash.
- `unlockBicycle`: Rate-limited PIN verification and stand release.
- `checkSessionExpiryAndNotifications`: Scheduled cron function executing every 1 minute to dispatch 10-minute warning push notifications and free stands upon grace-period expiry.
- `checkHealth`: Diagnostic latency and status probe.

### Step 4: Deploy Web App to Firebase Hosting
```bash
firebase deploy --only hosting
```
Once completed, Firebase will output your live URL:
`https://parkshark-vit.web.app` (or custom domain `https://parkshark.vit.ac.in`).

---

## 4. Production Monitoring & Alerting Recommendations

### 1. Google Cloud Logging & Metrics
- **Error Budget Alerting**: Create a metric-based alert in Google Cloud Monitoring for Cloud Functions with HTTP status code `>= 500`. Set notification channels via Slack or email.
- **Concurrency & Cold Starts**: Monitor Cloud Functions v2 execution duration (`p95 < 800ms`). Set `minInstances: 1` on `lockBicycle` if zero cold-start latency is required during morning 8:00 AM rush hours.

### 2. Firestore Usage & Quota Monitoring
- Monitor Firestore read/write operations in the Firebase Console.
- Ensure stand listings are cached on the client via Zustand and updated through real-time snapshots (`onSnapshot`) rather than polled queries.

### 3. Firebase Performance Monitoring & Lighthouse Targets
- **Target**: Lighthouse Performance score **90+** on Login and Dashboard views.
- **Lazy Loading**: Three.js 3D canvas is dynamically imported (`React.lazy`), preventing heavy 3D shaders from blocking initial page loads.
- **Low Graphics Mode**: Built-in toggle enables battery-saving rendering on mid-range mobile devices:
  - Disables real-time directional light shadow maps
  - Reduces tree instanced geometry count by 50%
  - Clamps Canvas device pixel ratio (DPR) to 1.0.

### 4. PWA & Service Worker Health
- Service worker (`/sw.js`) provides automated caching for static scripts, fonts, and stylesheets.
- Offline navigation fallback serves [`/offline.html`](../AEl0wwzRqWIYWHjt-grok-workspace/public/offline.html) with graceful retry capabilities when campus Wi-Fi drops.

---

## 5. End-to-End Test Execution

To execute the full Playwright end-to-end integration test against the running application:
```bash
cd AEl0wwzRqWIYWHjt-grok-workspace
npm run test:e2e
```
Verifies the complete student lifecycle:
`Student Login` → `Find Nearest Stand` → `Scan QR & Lock` → `Active Countdown Timer` → `4-Digit PIN Unlock`.
