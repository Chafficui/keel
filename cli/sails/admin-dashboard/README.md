# Admin Dashboard Sail

Adds a user management and metrics dashboard to your keel application. Access is restricted to email addresses listed in the `ADMIN_EMAILS` environment variable.

## Features

- Dashboard with stats cards (total users, new this week/month, active sessions)
- User signup chart (last 30 days) powered by recharts
- Users table with search, sorting, and pagination
- User detail view with admin actions
- Admin actions: verify email, delete user
- Access controlled via `ADMIN_EMAILS` environment variable
- Admin middleware for backend route protection

## Prerequisites

- A working keel project with BetterAuth authentication
- At least one user account with an email you want to use as admin

## Installation

```bash
npx tsx sails/admin-dashboard/install.ts
```

The installer will prompt for admin email addresses and configure everything automatically.

## Manual Setup

### 1. Environment Variables

Add the following to your `.env`:

```env
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

Multiple emails are separated by commas.

### 2. Access the Dashboard

1. Start your dev server: `npm run dev`
2. Log in with an admin email address
3. Navigate to `/admin`

## Architecture

### Backend

**Admin Middleware** (`src/middleware/admin.ts`)

Checks if the authenticated user's email is in the `ADMIN_EMAILS` list. Returns 403 if not. Must be used after `requireAuth`.

**Admin Routes** (`src/routes/admin.ts`)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/users | List users (paginated, searchable) |
| GET | /api/admin/users/:id | Get user details |
| PATCH | /api/admin/users/:id | Update user (name, emailVerified) |
| DELETE | /api/admin/users/:id | Delete a user |
| GET | /api/admin/stats | Dashboard statistics |

All routes require authentication + admin privileges.

### Frontend

**Dashboard** (`/admin`)

The main admin page showing:
- Stats cards with key metrics
- Line chart of user signups over the last 30 days
- Searchable, sortable users table

**User Detail** (`/admin/users/:id`)

Detailed view of a single user with:
- User profile information
- Active session count
- Admin actions (verify email, delete user)

### Components

- `StatsCard` - Reusable card for displaying a metric with optional trend
- `UsersTable` - Table with search, sort, and pagination

### Hooks

- `useAdminStats()` - Fetch dashboard statistics
- `useAdminUsers(page, search)` - Fetch paginated user list
- `fetchUser(id)` - Get single user details
- `updateUser(id, data)` - Update user fields
- `deleteUser(id)` - Delete a user

## Customization

### Adding Admin Link to Header

Add a link to the admin dashboard in your Header component for admin users:

```tsx
{isAuthenticated && isAdmin && (
  <Link to="/admin" className="text-sm font-medium text-keel-gray-400 hover:text-white">
    Admin
  </Link>
)}
```

You can check admin status by comparing the user's email against a list fetched from the backend, or by adding an admin check API endpoint.

### Extending the Dashboard

Add new stats cards by modifying `Dashboard.tsx` and adding corresponding backend queries in `routes/admin.ts`.

### Adding More Admin Actions

Extend the `PATCH /api/admin/users/:id` endpoint to support additional fields, or add new endpoints for other admin operations (e.g., ban user, reset password, impersonate).
