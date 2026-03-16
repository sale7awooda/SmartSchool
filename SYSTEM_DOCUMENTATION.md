# Smart School System Documentation

## Overview
Smart School is a comprehensive school management system designed to streamline academic, administrative, and communication processes within an educational institution.

## Architecture
The system is built using Next.js (App Router), leveraging server-side rendering for performance and SEO. It uses Tailwind CSS for styling and `lucide-react` for iconography.

## Key Components
- **Logo**: A reusable component that displays the application logo (`/icon.svg`).
- **Dashboard**: The central hub for administrators, teachers, and students.
- **Settings**: A modular settings page for managing profile, general preferences, security, and roles.
- **Schedule Wizard**: A step-by-step tool for configuring school periods, subjects, and teachers.

## Navigation
The navigation system is role-based, ensuring that users only see the modules and features relevant to their permissions (e.g., admin, teacher, student).

## PWA Configuration
The application is configured as a Progressive Web App (PWA) with a manifest file (`/app/manifest.ts`) that defines the app's name, icons (in various sizes), and theme colors, allowing for an app-like experience on mobile devices.

## Branding
The application is branded as "Smart School". The primary icon used throughout the system is `icon.svg`, located in the `/public` directory.
