# Google OAuth Sail

Adds Google sign-in to your keel application using BetterAuth's social provider system.

## Prerequisites

- A Google Cloud project
- OAuth 2.0 credentials (Client ID and Client Secret)

## Installation

```bash
npx tsx sails/google-oauth/install.ts
```

The installer will prompt for your Google OAuth credentials and configure everything automatically.

## Manual Setup: Google Cloud Console

### 1. Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown in the top bar
3. Click **New Project** or select an existing one

### 2. Enable the Google+ API (if not enabled)

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click **Enable**

### 3. Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (or **Internal** for Google Workspace orgs)
3. Fill in the required fields:
   - **App name**: Your application name
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if in "Testing" mode

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Set the name (e.g., "My App - Web")
5. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (Vite dev server)
   - `https://yourdomain.com` (production)
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### 5. Configure Environment Variables

Add to your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## How It Works

### Authentication Flow

1. User clicks "Continue with Google" button
2. BetterAuth redirects to Google's OAuth consent screen
3. User authorizes the application
4. Google redirects back to `/api/auth/callback/google`
5. BetterAuth creates or links the user account
6. User is redirected to the dashboard

### Files Modified

**Backend:**
- `src/auth/index.ts` -- Google added as a social provider in BetterAuth config
- `src/env.ts` -- Environment variable validation for Google credentials

**Frontend:**
- `src/components/auth/LoginForm.tsx` -- Google sign-in button added
- `src/components/auth/SignupForm.tsx` -- Google sign-in button added

### Files Added

**Frontend:**
- `src/components/auth/GoogleButton.tsx` -- Styled Google sign-in button component

## Capacitor / Native Apps

For native mobile apps using Capacitor, Google OAuth works through the system browser (in-app browser tab). The redirect URI remains the same since the native app loads the web app in a WebView.

If you need native Google Sign-In (using the Google SDK directly), you will need to:

1. Create separate OAuth credentials for iOS and Android
2. Use `@capacitor/google-auth` plugin
3. Pass the token to BetterAuth for session creation

## Troubleshooting

### "redirect_uri_mismatch" Error

Make sure your redirect URI in Google Cloud Console exactly matches:
- Development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://yourdomain.com/api/auth/callback/google`

The port must match your backend server port, and the path is determined by BetterAuth.

### "Access blocked: app has not completed verification"

Your OAuth consent screen is in "Testing" mode. Either:
- Add test users in the consent screen settings, or
- Submit your app for verification (required for production)

### Users Not Being Linked

If a user signs up with email/password and later tries Google OAuth with the same email, BetterAuth will attempt to link the accounts. Make sure `account linking` is enabled in your BetterAuth configuration.
