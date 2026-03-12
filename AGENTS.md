## Project Summary
The Tecknoworks Operational Platform is a comprehensive enterprise suite designed for tracking projects, managing talent, and optimizing operational workflows. It provides a centralized system for resource management and decision-making.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Runtime**: Bun
- **Authentication**: Supabase Auth (Email/Password & Microsoft OAuth)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS, Framer Motion (Animations), Lucide React (Icons)
- **UI Components**: Radix UI / Shadcn UI components
- **Notifications**: Sonner

## Architecture
- `src/app`: Next.js App Router pages and API routes
- `src/components`: UI and feature-specific components
- `src/lib`: Shared libraries, including Supabase client configuration
- `src/hooks`: Custom React hooks
- `src/app/auth`: Authentication-related routes including login, callback, and password management

## User Preferences
- **Authentication**: Prefers Microsoft/Azure SSO for enterprise access.
- **Dynamic Redirects**: Uses `window.location.origin` in OAuth flows to ensure compatibility across local development and production environments.
- **UI/UX**: Clean, professional enterprise aesthetic with dark-themed hero sections and high-contrast accents (blue-500/600).

## Project Guidelines
- **Named Exports**: Prefer named exports for components and utilities.
- **Client Components**: Minimize `'use client'` usage; only use it when interactivity is required.
- **No Comments**: Avoid adding code comments unless specifically requested.
- **Safety**: Always wrap `useSearchParams()` in a `Suspense` boundary.
- **Database**: Always inspect table schemas using the SQL tool before performing write operations.

## Common Patterns
- **OAuth Flow**: `supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: `${window.location.origin}/auth/callback` } })`
- **Toasts**: Use `toast.error` and `toast.success` from `sonner` for user feedback.
