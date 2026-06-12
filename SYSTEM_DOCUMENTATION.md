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

## Authentication Flow & Login Credentials
When a new student is registered, the system automatically provisions authentication accounts:

**Student Login:**
- **Email/Username**: Can use either their full generated email (`student_<student_id>@school.com`) or simply enter their Student ID (e.g., `STU001`), which the system automatically intercepts and formats.
- **Default Password**: `password123` (Students are prompted to change this upon first login).

**Parent Login:**
- **Email/Username**: Uses the parent's explicitly provided email address. If no email is provided during registration, a fallback email is generated using their phone number: `parent_<phone_digits>@school.com`. The parent can simply use their provided email to log in. In some UI flows they can also log in using the student ID and the parent-specific password.
- **Default Password**: The parent's phone number (digits only), or `password123` if no phone number was provided.

## PWA Configuration
The application is configured as a Progressive Web App (PWA) with a manifest file (`/app/manifest.ts`) that defines the app's name, icons (in various sizes), and theme colors, allowing for an app-like experience on mobile devices.

## Branding
The application is branded as "Smart School". The primary icon used throughout the system is `icon.svg`, located in the `/public` directory.
