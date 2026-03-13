# Smart School System - Comprehensive Replica Guide

This document serves as the ultimate blueprint for the "Smart School" system. It contains every detail, design token, architectural decision, and component structure required to build a pixel-perfect replica of this application.

---

## 1. Tech Stack & Core Libraries
- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Icons:** `lucide-react`
- **Animations:** `motion/react` (Framer Motion)
- **State Management:** React Context API (`auth-context.tsx`, `language-context.tsx`)
- **Theming:** `next-themes` (Dark/Light mode support)
- **PWA:** Custom Service Worker (`sw.js`) and `manifest.ts`
- **Toast Notifications:** `sonner` (via shadcn/ui)

---

## 2. Global Design System (Pixel-Perfect Tokens)

### 2.1 Colors & Theming (from `globals.css`)
The system uses a custom `oklch` color palette mapped to standard Tailwind variables.

**Light Mode:**
- Background: `oklch(1 0 0)` (White)
- Foreground: `oklch(0.145 0 0)` (Dark Slate)
- Primary: `oklch(0.205 0 0)`
- Primary Foreground: `oklch(0.985 0 0)`
- Destructive: `oklch(0.58 0.22 27)`

**Dark Mode:**
- Background: `oklch(0.12 0.015 255)` (Deep Slate Blue)
- Foreground: `oklch(0.95 0.01 255)`
- Primary: `oklch(0.6 0.18 255)`
- Border: `oklch(0.22 0.02 255 / 0.8)`

**Tailwind Utility Classes Used Extensively:**
- **Backgrounds:** `bg-slate-50`, `bg-white`, `dark:bg-slate-900`, `dark:bg-slate-950`
- **Text:** `text-slate-900`, `text-slate-500`, `text-indigo-600`
- **Borders:** `border-slate-100`, `dark:border-slate-800`

### 2.2 Typography
- **Font Family:** `Geist` (sans-serif) loaded via `next/font/google`.
- **Headings:** `tracking-tight`, `font-bold` or `font-black`.
- **Subtitles:** `text-sm font-medium text-slate-500 uppercase tracking-wider`.

### 2.3 Border Radius & Shadows
- **Cards/Containers:** `rounded-[1.5rem]` (24px) or `rounded-[2rem]` (32px).
- **Buttons/Inputs:** `rounded-xl` (12px).
- **Icons/Avatars:** `rounded-2xl` (16px) or `rounded-3xl` (24px).
- **Shadows:** `shadow-sm` for cards, `shadow-xl` for the login modal, colored shadows for icons (e.g., `shadow-blue-500/20`).

### 2.4 Scrollbar (Custom CSS)
- Width/Height: `8px` (or `5px` for `.custom-scrollbar`).
- Track: `transparent`.
- Thumb: `#e2e8f0` (Light), `#1e293b` (Dark).
- Hover Thumb: `#cbd5e1` (Light), `#334155` (Dark).

---

## 3. Directory Structure

```text
/
├── app/
│   ├── globals.css           # Global styles and Tailwind config
│   ├── layout.tsx            # Root layout, providers, metadata
│   ├── manifest.ts           # PWA Manifest
│   ├── page.tsx              # Login Page (Home)
│   └── dashboard/            # Protected Dashboard Area
│       ├── layout.tsx        # Sidebar, Header, Mobile Nav
│       ├── page.tsx          # Role-specific Dashboard Home
│       ├── academics/        # Academics Module
│       ├── analytics/        # Analytics Module
│       ├── attendance/       # Attendance Module
│       ├── communication/    # Communication Module
│       ├── exams/            # Exams Module
│       ├── fees/             # Fees & Billing Module
│       ├── hr/               # HR Module
│       ├── library/          # Library Module
│       ├── operations/       # Operations Module
│       ├── schedule/         # Schedule/Timetable Module
│       ├── settings/         # Settings Module
│       ├── students/         # Students Module
│       └── transport/        # Transport Module
├── components/
│   ├── dashboard-header.tsx  # Top navigation bar
│   ├── logo.tsx              # Reusable Logo component
│   ├── pwa-registry.tsx      # Service worker registration
│   ├── StaffProfileModal.tsx # Modal for viewing staff details
│   ├── theme-provider.tsx    # next-themes wrapper
│   └── ui/                   # Reusable UI components (shadcn)
├── lib/
│   ├── auth-context.tsx      # Authentication state & logic
│   ├── language-context.tsx  # i18n and RTL support
│   ├── mock-db.ts            # Mock data (Users, Stats, Notices)
│   └── utils.ts              # Tailwind merge utilities (cn)
└── public/
    ├── icon.svg              # Primary App Icon
    ├── logo.svg              # Legacy Logo
    └── sw.js                 # Service Worker
```

---

## 4. Core Infrastructure

### 4.1 Authentication (`lib/auth-context.tsx`)
- **State:** `user` (User object | null), `isLoading` (boolean).
- **Persistence:** Uses `localStorage.getItem('school_mvp_user')`.
- **Methods:**
  - `loginStaff(email)`: Authenticates staff members.
  - `loginParent(studentId, phone)`: Authenticates parents.
  - `logout()`: Clears local storage and redirects to `/`.
  - `switchStudent(studentId)`: Allows parents to switch between multiple children.
- **Routing Protection:** Redirects unauthenticated users from `/dashboard/*` to `/`, and authenticated users from `/` to `/dashboard`.

### 4.2 Role-Based Access Control (RBAC)
Roles defined in the system: `superadmin`, `schoolAdmin`, `teacher`, `accountant`, `parent`, `student`, `staff`.
The Sidebar (`app/dashboard/layout.tsx`) filters navigation items based on `user.role`.

### 4.3 PWA Configuration
- **Manifest (`app/manifest.ts`):** Name: "Smart School", Theme Color: `#4f46e5`, Background: `#f8fafc`.
- **Icons:** Uses `/icon.svg` mapped to sizes: 72x72, 96x96, 128x128, 144x144, 192x192, 256x256, 384x384, 512x512.
- **Service Worker (`public/sw.js`):** Registered via `PwaRegistry` component in the root layout.

---

## 5. Detailed Page Specifications

### 5.1 Login Page (`app/page.tsx`)
- **Background:** `bg-slate-50` with a massive blue decorative header (`bg-blue-600 rounded-b-[3rem] sm:rounded-b-[5rem] h-96 absolute top-0 w-full`).
- **Logo Animation:** Uses `motion.div` with `scale`, `rotate`, and a spring transition. Floating icons (GraduationCap, BookOpen) animate infinitely on the Y-axis.
- **Tabs:** "Staff & Admin" vs "Parents".
- **Inputs:** `px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10`.
- **MVP Quick Login:** A grid of buttons at the bottom allowing instant login as Admin, Teacher, Accountant, Parent, or Student.

### 5.2 Dashboard Layout (`app/dashboard/layout.tsx`)
- **Desktop Sidebar:**
  - Width: `w-56` (expanded) or `w-20` (collapsed).
  - Background: `bg-white dark:bg-slate-900`.
  - Active Item: `bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-100`.
  - Icons: Size `24`, `strokeWidth={isActive ? 2.5 : 2}`.
- **Mobile Drawer:** Hidden on `md` and up. Slides in from the left (or right if RTL).
- **Mobile Bottom Nav:** Fixed bottom navigation showing the first 5 nav items for quick access on small screens.
- **Header:** Contains Breadcrumbs, Search, Notifications, Theme Toggle, Language Toggle, and User Profile dropdown.

### 5.3 Dashboard Home (`app/dashboard/page.tsx`)
Renders different views based on the user's role:
- **AdminDashboard:** Shows 4 stat cards (Total Students, Attendance, Fees, Pending Dues) with colored icon containers (`w-12 h-12 rounded-2xl`). Includes "Recent Activity" and "Urgent Alerts" lists.
- **TeacherDashboard:** Shows "Today's Schedule" with quick "Mark Attendance" buttons, and "Pending Grading" tasks.
- **AccountantDashboard:** Shows "Collected Today" and "Pending Invoices" with a massive "Record New Payment" CTA.
- **ParentDashboard:** Features a prominent gradient card (`bg-gradient-to-br from-indigo-600 to-purple-700`) displaying the student's name and grade. Below it are stats (Attendance, Next Fee Due, Upcoming Assignments) and a list of Recent Grades.

---

## 6. Key Components

### 6.1 Logo (`components/logo.tsx`)
```tsx
import Image from 'next/image';
export function Logo({ className = "w-16 h-16", withBackground = false }) {
  return (
    <div className={`relative ${className} ${withBackground ? 'bg-white rounded-3xl' : ''}`}>
      <Image src="/icon.svg" alt="Smart School Logo" fill className="object-contain" referrerPolicy="no-referrer" />
    </div>
  );
}
```

### 6.2 Animations (`motion/react`)
Standard entrance animation used across the dashboard:
```tsx
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
```

---

## 7. Mock Database (`lib/mock-db.ts`)
The system relies on a robust mock database for the MVP.
- **MOCK_USERS:** Array of `User` objects containing `id`, `name`, `email`, `role`, `avatar`, and optional `staffProfile`.
- **MOCK_PARENTS:** Array of parent users containing `studentIds` and `phone`.
- **MOCK_STATS:** Object containing `totalStudents`, `attendanceToday`, `feeCollected`, `pendingFees`.
- **MOCK_NOTICES:** Array of notices with `title`, `date`, `author`, `isImportant`.

---

## 8. Deployment & Config

### 8.1 `next.config.ts`
Must include `output: 'standalone'` for deployment compatibility.

### 8.2 Metadata (`app/layout.tsx`)
```tsx
export const metadata: Metadata = {
  title: 'Smart School',
  description: 'Mobile-first school management system',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};
```

---
*End of Specification. Follow these guidelines strictly to achieve a 1:1 pixel-perfect replica.*
