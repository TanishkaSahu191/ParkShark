# ParkShark — Smart Bicycle Management System

A 3D interactive campus walkthrough and Smart Bicycle Management System for VIT Vellore built with React 19, Three.js, React Three Fiber, Tailwind CSS v4, Zustand, and Firebase.

---

## 1. Codebase Architecture Summary

### Project Structure
- **/src/campus/**: 3D scene, world physics, avatar movement, and bicycle stand geometry.
  - `world.ts`: Defines campus coordinates, geometry, collision bounding boxes (`SOLIDS`), circular colliders (`CIRCLES`), zones, and the 150 bicycle parking slots.
  - `BikeRacks.tsx`: Uses `THREE.InstancedMesh` with a dynamic 2D canvas texture atlas (`makeAtlas`) to render all 150 bicycle slots (plates, posts, bars, stands) in single draw calls.
  - `Player.tsx`: Controllable third-person player with movement, jumping, running, camera look drag, and continuous collision response.
  - `CampusScene.tsx`: Lighting, sky, fog, scenery, structures, racks, and player avatar.
  - `Hud.tsx`: 2D canvas minimap, rotating compass, place banner, and speed meter.
  - `sim.ts`: Shared real-time state (`x, y, z`, `yaw`, `pitch`, `speed`, keys) avoiding React re-render overhead.
- **/src/services/**: Backend and cloud integration modules.
  - `firebase.ts`: Firebase App, Auth, Firestore, and Functions v2 initialization, reading from `import.meta.env` with automatic local emulator suite fallback.
- **/src/routes/**: Application pages and TanStack layout routes.
- **/functions/**: Firebase Cloud Functions v2 (Admin SDK, salted hashing, transactional lock/unlock).
- **/migrations/** & **/scripts/**: Build tools and database utilities.

### The 150 Bicycle Racks
- **File**: [`src/campus/world.ts`](AEl0wwzRqWIYWHjt-grok-workspace/src/campus/world.ts)
- **Definition**: The 150 slots (`AB1-01` to `AB1-50`, `AB2-01` to `AB2-50`, `AB3-01` to `AB3-50`) are generated procedurally by `buildSlots()`. Each stand is divided into two facing rows with an aisle, clustered into left and right rack groups.
- **Placement**: Distributed across open campus lawn zones:
  - **West Lawn Stand (`AB1-01` – `AB1-50`)**: In front of Boys' Hostel 1 (`x: -42.8, z: 3.1`).
  - **North Grounds Stand (`AB2-01` – `AB2-50`)**: On the North lawn south of Chancellor's Residence (`x: 26.6, z: -49.8`).
  - **East Lawn Stand (`AB3-01` – `AB3-50`)**: In front of Girls' Hostel 1 (`x: 49.5, z: 4.5`).

### Player Movement and Collision Resolution
- **Movement (`Player.tsx`)**:
  - Keys: `W`, `A`, `S`, `D` or arrow keys move the player relative to the third-person camera angle.
  - Sprint: `Shift` boosts velocity from walk speed (`4.6 m/s`) to sprint speed (`8.8 m/s`).
  - Jump: `Space` applies vertical impulse (`vy = 6.2 m/s`) with simulated gravity (`-18 m/s²`).
  - Camera: Dragging with mouse or pointer capture smoothly adjusts camera `yaw` and `pitch` around the avatar.
- **Collision Detection & Resolution (`world.ts`)**:
  - The avatar is modeled as a 2D cylinder with radius `0.42m`.
  - Static obstacles are stored as axis-aligned bounding boxes (`SOLIDS`) and circular obstacles (`CIRCLES`, e.g., trees and fountain).
  - Each frame, `resolve(px, pz, radius, out)` iterates through all colliders. If the avatar overlaps a bounding box, `separateAabb()` computes the minimum separation vector and pushes the player out to slide smoothly along walls and racks without snagging.

---

## 2. Firebase Setup Checklist (Firebase Console)

To connect the project to a live Firebase backend, perform the following steps:

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
   - Enter project name (e.g., `parkshark-vit`) and click **Create Project**.
2. **Register Web App**:
   - In project overview, click the **Web** icon (`</>`) to add a web application.
   - Enter nickname (e.g. `ParkShark Web`), click **Register app**.
   - Copy the `firebaseConfig` keys into your `.env` file (see `.env.example`).
3. **Enable Authentication (Phone)**:
   - Navigate to **Build > Authentication** > **Get started**.
   - Under **Sign-in method**, enable **Phone**.
   - Under **Phone numbers for testing**, add test numbers (e.g. `+91 9876543210` with OTP `123456`) for local testing.
4. **Enable Cloud Firestore**:
   - Navigate to **Build > Firestore Database** > **Create database**.
   - Select your preferred region (e.g., `asia-south1`).
   - Start in **Production mode** (the repository's `firestore.rules` will be deployed).
5. **Enable Cloud Functions**:
   - Upgrade your project to the **Blaze (Pay as you go)** plan (required for Cloud Functions).
   - Install Firebase CLI: `npm install -g firebase-tools`.
   - Log in: `firebase login`.
6. **Enable Firebase Hosting**:
   - Navigate to **Build > Hosting** > **Get started**.

---

## 3. Running Locally with Firebase Emulator Suite

You can develop and test without creating a live Firebase project by using the local Firebase Emulator Suite:

1. **Install Firebase CLI** (if not installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Configure Environment for Emulators**:
   In `AEl0wwzRqWIYWHjt-grok-workspace/.env`:
   ```bash
   VITE_USE_FIREBASE_EMULATOR=true
   ```

3. **Start the Firebase Emulators**:
   ```bash
   cd AEl0wwzRqWIYWHjt-grok-workspace
   firebase emulators:start
   ```
   - **Emulator UI**: `http://localhost:4000`
   - **Auth Emulator**: `http://localhost:9099`
   - **Firestore Emulator**: `http://localhost:8085`
   - **Functions Emulator**: `http://localhost:5001`

4. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080/`.

---

## 4. Controls
- **W, A, S, D**: Move relative to the camera
- **Mouse Drag**: Look around
- **Shift**: Run
- **Space**: Jump
