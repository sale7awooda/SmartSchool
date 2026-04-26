# Next-Gen Edge PWA Architecture (2026 Blueprint)

## Executive Summary
This document serves as the master blueprint for transitioning the current School Management dashboard into a state-of-the-art, Local-First, Mobile-First PWA compliant with 2026 development standards. 

The goal is to shift from a traditional cloud-dependent web application (SWR + heavy React tables) to an edge-native, local-first mobile experience featuring biometric access, offline-WASM databases, gesture-driven card UIs, and robust push notification support.

---

## 1. Local-First Synchronization Layer (Data Architecture)

**Objective**: Move from traditional `swr` fetching to an Offline-First approach where the UI reads/writes instantly to a local database and synchronizes seamlessly in the background.

**Tech Stack**: **PowerSync** or **RxDB** over local SQLite-WASM + **Supabase realtime**.

### Flow & Logic:
1. **Initial Boot (Online)**:
   - App authenticates the user.
   - PowerSync generates a local SQLite-WASM database.
   - Sync buckets are pulled based on User Roles (e.g., a Teacher only syncs their specific class rosters, assigned schedules, and recent messages).
2. **Operations (Offline or Spotty network)**:
   - Example (Attendance Module): A teacher opens the app in a classroom with zero Wi-Fi.
   - The UI fetches the class roster from local `SQLite`.
   - The teacher swipes a student card to mark "Absent".
   - An `UPDATE` query runs *instantly* on the local SQLite DB. The UI updates via optimistic subscriptions.
   - PowerSync queues the mutation.
3. **Reconnection**:
   - The embedded sync engine detects network restoration.
   - Queued mutations are pushed up to Supabase REST/GraphQL endpoints.
   - Supabase PostgREST processes the mutation and broadcasts the change via Supabase Realtime to other connected clients.

---

## 2. Mobile UX Topography (View Architecture)

**Objective**: Replace dense, desktop-oriented sidebars and dense data-tables with mobile-native primitives.

**Tech Stack**: Headless UI + **Framer Motion** + Virtualized Lists (e.g., `tanstack-virtual`).

### Core Layout:
- **Desktop**: Collapsible adaptive sidebar, expanding grid, data-heavy tables.
- **Mobile (Default)**: Bottom Navigation Bar.
  - *Primary Nav Nodes*: Dashboard (Overview), Classes (Attendance/Grades), Messages (Comms), Profile (Settings).

### Gesture Integrations:
- **Tinder-like Card Stacks** for quick-action workflows (e.g., marking test papers or reviewing leave requests).
- **List Item Swipes**: 
  - *Right-Swipe* -> Positive action (Mark Present, Approve, Pay).
  - *Left-Swipe* -> Negative/Secondary action (Mark Absent, Reject, Details).
  - Implementation: `framer-motion` `<motion.div drag="x">` tied to pan gesture velocity thresholds.

---

## 3. Web Push & Background Sync (Push Architecture)

**Objective**: Standardize native app-like notifications bypassing OS app stores entirely.

**Tech Stack**: `@serwist/next` + Web Push API + Service Worker caching.

### Logic Flow:
1. **VAPID Keys**: Setup standard VAPID public/private keypairs mapped to Supabase secrets.
2. **Subscription**: Upon first login, prompt the user for Push Notification permissions. Store the user's `pushSubscription` object in the Supabase public user profile.
3. **Payload Delivery**:
   - When the Admin broadcasts an emergency notice, a Supabase Edge Function loops through relevant subscriber endpoints, pushing out standardized payloads.
   - The Service Worker intercepts the `push` event, extracting the data payload.
   - The notification is rendered even if the web app is fully closed.
4. **Push Cache**: Critical JSON payloads attached to notifications (e.g., "New Exam Schedule") are intercepted by the SW and pre-cached into Cache Storage so that clicking the notification opens the PWA *instantly* with the data already loaded.

---

## 4. Biometric Edge Auth (Security Architecture)

**Objective**: Zero-friction login with enterprise-grade security.

**Tech Stack**: Supabase Auth (Native Passkey Support) + WebAuthn.

### Logic Flow:
1. **Device Registration**: After standard Email/Password or standard OAuth login, prompt: "Enable Face ID / Fingerprint for faster login?"
2. **Passkey Generation**: 
   - App calls `navigator.credentials.create()`. 
   - A biometric challenge is issued via Supabase.
   - Device OS (iOS FaceID, Android Fingerprint, Mac TouchID) generates a public cryptographic key.
   - Key is stored in Supabase under the User Auth model.
3. **Returning Users**: 
   - Open app -> `supabase.auth.signInWithPasskey()`.
   - Complete biometric check -> instantly authenticated. No passwords typed, no OTPs checked.

---

## 5. Component & Styling Paradigm (UI Architecture)

**Objective**: Hyper-fluid, container-aware styling that works on any embedded frame or viewport size.

**Tech Stack**: **Tailwind v4** + `@container` queries + CSS variable themes + **Lucide Icons**.

### Guidelines:
- **Say Goodbye to Viewport Breakpoints (`sm:`, `md:`) in micro-components.** Use `@container` logic so a generic `StudentCard` displays horizontally when given 600px of space, but stacks vertically when squeezed into a 300px sidebar, entirely independent of the parent window size.
- **Touch-Action CSS**: Heavily utilize `touch-action: pan-y` on draggable elements to block native mobile bounce scrolling while the user interacts with gesture cards.
- **Active States**: Rely on `active:scale-95` on touchable buttons instead of just `hover:bg-gray-100`, providing tactile, immediate feedback natively expected on mobile devices.

---

## 6. Detailed Module Transition Strategy

Below outlines how the existing modules transition from the current SWR logic to the 2026 PWA paradigm:

| Module | Current State | 2026 PWA Paradigm |
| :--- | :--- | :--- |
| **Dashboard** | Grid of numeric counters, dense recent activity lists. | Container-sized widgets. Bottom Nav primary tab. Pull-to-refresh enabled. |
| **Attendance** | Large desktop data-tables with checkboxes per student. | Date selector on top. Tinder-style swipe cards for rapid marking OR a virtualized mobile list with swipeable rows (Right = Present, Left = Absent). Powered locally via SQLite. |
| **Students** | Paginating data table pulling from `swr`. | Search-first visual grid. Biometric verification for modifying sensitive medical/fee data. |
| **Communication** | Forms requiring constant connection to send emails/notices. | Sentbox stored in `SQLite`. Optimistic UI updates. Offline queueing: "Sent, waiting for network". |
| **Fees** | Complex billing tables. | Native-feeling list of invoices. Bottom sheet popovers (`Drawer` from Vaul) for initiating payments seamlessly. |
| **HR / Staff** | Spreadsheets. | Bottom sheet directory. Touch-to-call, touch-to-email utilizing native URI handlers (`tel:`, `mailto:`). |

---

## 7. Migration Implementation Plan

To execute this replica, the development lifecycle will be phased as follows:

**Phase 1: Foundation (Zero-UI Layer)**
- Swap `next-pwa` (if existing) with `@serwist/next`.
- Initialize `PowerSync` or `RxDB` wrapper connecting to Supabase realtime and Postgres. Let SWR and PowerSync temporarily coexist.
- Configure WebAuthN Passkey scopes within Supabase Auth settings. 

**Phase 2: Core UX Transformation**
- Implement the App Shell redesign (Bottom Navigation for mobile, collapsing sidebar for desktop).
- Setup Tailwind v4 with the `@container` plugin.
- Replace globally utilized components (e.g., Modals) with responsive variations (e.g., Modals on Desktop, Vaul Drawers on Mobile).

**Phase 3: Module-by-Module Offline conversion**
- Start with **Attendance** (Highest priority for Offline use-case). Implement the gesture swiping `Framer Motion` lists.
- Advance to **Communication** and **Assessments**.

**Phase 4: Notifications & Polish**
- Web Push Edge Functions and service-worker interception.
- App manifest adjustments for custom splash screens, standalone minimal UI mode, and theme-color dynamic toggling based on light/dark mode preference.
