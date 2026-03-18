# Architecture Overview

This document describes the architecture of the keel template (a codai project) — a full-stack SaaS starter with authentication, transactional email, and Capacitor mobile support.

## Monorepo Structure

```
keel/
├── packages/
│   ├── backend/          Express + Drizzle + BetterAuth API server
│   ├── frontend/         React + Vite + Capacitor SPA
│   ├── shared/           Shared types, constants, and utilities
│   └── transactional/    React Email templates + sending service
├── sails/                Optional feature sails
│   ├── _template/        Sail scaffold template
│   ├── google-oauth/     Google OAuth social login
│   └── stripe/           Stripe subscriptions
├── cli/                  create-keel scaffolding CLI
├── docs/                 Documentation
├── package.json          Root workspace config
└── tsconfig.base.json    Shared TypeScript config
```

The project uses **npm workspaces** to manage the monorepo. All packages share a single `node_modules` at the root, and cross-package imports use workspace references (`@keel/shared`).

## Package Descriptions

### Backend (`packages/backend`)

The API server built with:

- **Express** — HTTP server and routing
- **BetterAuth** — Authentication (email/password, sessions, email verification)
- **Drizzle ORM** — Type-safe SQL queries and schema management
- **PostgreSQL** — Primary database
- **Zod** — Request validation and environment variable parsing

Key directories:
```
packages/backend/
├── src/
│   ├── auth/             BetterAuth configuration
│   ├── db/
│   │   ├── schema/       Drizzle table definitions
│   │   └── index.ts      Database connection
│   ├── middleware/        Express middleware (auth, error handling)
│   ├── routes/           API route handlers
│   ├── services/         Business logic layer
│   ├── env.ts            Environment variable validation
│   └── index.ts          App entry point
├── drizzle/              Generated SQL migrations
└── drizzle.config.ts     Drizzle Kit configuration
```

### Frontend (`packages/frontend`)

The single-page application built with:

- **React 19** — UI framework
- **Vite** — Build tool and dev server
- **React Router** — Client-side routing
- **TailwindCSS** — Utility-first styling
- **Capacitor** — Native iOS/Android shell

Key directories:
```
packages/frontend/
├── src/
│   ├── components/       Reusable UI components
│   │   ├── auth/         Auth forms (login, signup, etc.)
│   │   └── ui/           Generic UI components
│   ├── hooks/            Custom React hooks
│   ├── lib/              Utilities (auth client, API client)
│   ├── pages/            Route-level page components
│   ├── router.tsx        Route definitions
│   └── main.tsx          App entry point
├── capacitor.config.ts   Capacitor configuration
├── ios/                  Native iOS project (Xcode)
└── android/              Native Android project (Gradle)
```

### Shared (`packages/shared`)

Cross-package code:

- TypeScript type definitions shared between frontend and backend
- Constants (error codes, config values)
- Utility functions (validation, formatting)
- Zod schemas used by both API and client

### Transactional (`packages/transactional`)

Email infrastructure:

- **React Email** — Email template components
- Email sending service (Resend, AWS SES, or SMTP)
- Templates: welcome, email verification, password reset, account deletion

## Data Flow

### Authentication Flow

```
┌──────────┐     POST /api/auth/signup     ┌──────────┐
│ Frontend │ ─────────────────────────────> │ Backend  │
│          │                                │          │
│          │     Set-Cookie: session        │ BetterAuth│
│          │ <───────────────────────────── │          │
│          │                                │          │
│          │                                │  ┌──────┐│
│          │                                │  │Drizzle││
│          │                                │  │  DB   ││
│          │                                │  └──────┘│
│          │     ─── verification email ──> │  ┌──────┐│
│          │                                │  │ Email ││
│          │                                │  │Service││
│          │                                │  └──────┘│
└──────────┘                                └──────────┘
```

1. Frontend sends credentials to BetterAuth endpoints
2. BetterAuth validates, creates user and session in PostgreSQL via Drizzle
3. Session cookie is set (web) or Bearer token is returned (native)
4. Verification email is sent via the transactional email service
5. Subsequent requests include the session cookie/token for auth

### API Request Flow

```
Request → Express → Auth Middleware → Route Handler → Service → Drizzle → PostgreSQL
                                                                    ↓
Response ← Express ← Route Handler ← Service ← Drizzle ← Query Result
```

### Email Flow

```
Backend Service → Transactional Package → React Email (render) → Email Provider (send)
```

## Technology Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js | Universal JS, large ecosystem |
| API Framework | Express | Mature, minimal, huge middleware ecosystem |
| Auth | BetterAuth | Type-safe, full-featured, supports social providers |
| ORM | Drizzle | Type-safe SQL, lightweight, excellent DX |
| Database | PostgreSQL | Robust, feature-rich, excellent tooling |
| Frontend | React | Dominant ecosystem, Capacitor support |
| Build | Vite | Fast HMR, ESM-native, excellent plugin system |
| Styling | TailwindCSS | Rapid prototyping, no context switching |
| Mobile | Capacitor | Web-first, access to native APIs |
| Email | React Email | Component-based templates, great DX |
| Validation | Zod | TypeScript-native, composable schemas |

## Key Architectural Decisions

### 1. Monorepo with npm Workspaces

Using npm workspaces over Turborepo or Nx for simplicity. The shared package enables type-safe contracts between frontend and backend without code generation.

### 2. BetterAuth over NextAuth/Lucia

BetterAuth provides a complete auth system with built-in email verification, password reset, and social providers. It works seamlessly with any Express-based backend and has first-class TypeScript support.

### 3. Drizzle over Prisma

Drizzle generates zero runtime overhead (no client library), produces readable SQL, and its schema-as-code approach works well with the sail system's marker comments.

### 4. Capacitor over React Native

Capacitor wraps the existing web app in a native shell, meaning a single codebase serves web and mobile. This reduces maintenance burden at the cost of some native performance.

### 5. Sail System with Marker Comments

Rather than a plugin architecture with runtime overhead, sails use compile-time code insertion via marker comments. This produces clean, readable code that developers can modify after installation.

### 6. Transactional Email as Separate Package

Separating email templates allows independent development, testing, and preview. The React Email dev server provides instant preview without running the full backend.

## Marker Comments

The codebase includes marker comments where sails insert code:

```typescript
// Backend: src/index.ts
// [SAIL_IMPORTS]
// [SAIL_ROUTES]

// Backend: src/db/schema/index.ts
// [SAIL_SCHEMA]

// Backend: src/env.ts
// [SAIL_ENV_VARS]

// Backend: src/auth/index.ts
// [SAIL_SOCIAL_PROVIDERS]

// Frontend: src/router.tsx
// [SAIL_IMPORTS]
// [SAIL_ROUTES]

// Frontend: src/components/auth/LoginForm.tsx
// [SAIL_IMPORTS]
{/* [SAIL_SOCIAL_BUTTONS] */}
```

These markers are harmless comments that get removed naturally as sails populate them. See `docs/sail-development.md` for details.
