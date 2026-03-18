# Push Notifications Sail

Adds push notification support to your keel application using Capacitor and Firebase Cloud Messaging (FCM).

## Features

- Firebase Cloud Messaging for push delivery (iOS, Android)
- Capacitor integration for native device token management
- Device token registration and storage in PostgreSQL
- Server-side notification sending via firebase-admin
- React hook for permission handling, token lifecycle, and notification taps
- Automatic deep-link navigation on notification tap

## Prerequisites

- A Firebase project (https://console.firebase.google.com)
- Cloud Messaging API (V1) enabled in the Firebase project
- A Firebase service account JSON key file
- For iOS: An APNs authentication key from Apple Developer

## Installation

```bash
npx tsx sails/push-notifications/install.ts
```

The installer will guide you through Firebase setup and collect your service account credentials.

## Manual Setup

### 1. Firebase Project

1. Go to https://console.firebase.google.com
2. Create a new project (or select existing)
3. Go to **Project Settings > Cloud Messaging**
4. Ensure Cloud Messaging API (V1) is enabled

### 2. Service Account Key

1. Go to **Project Settings > Service Accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Extract these values for your `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### 3. iOS Configuration (APNs)

1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Create a new key, check **Apple Push Notifications service (APNs)**
3. Download the `.p8` key file
4. In Firebase Console > Project Settings > Cloud Messaging > iOS app:
   - Upload the APNs authentication key
   - Enter the Key ID and Team ID
5. Run `npx cap sync ios`

### 4. Android Configuration

1. In Firebase Console, add an Android app (use your app's package name)
2. Download `google-services.json`
3. Place it at `android/app/google-services.json`
4. Run `npx cap sync android`

## Architecture

### Database Schema

**push_tokens**
| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (UUID) |
| user_id | text | FK to users table (cascade delete) |
| token | text | FCM device token |
| platform | varchar(20) | ios, android, or web |
| created_at | timestamp | Registration time |

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/notifications/register | Yes | Register a device push token |
| DELETE | /api/notifications/unregister | Yes | Remove a device push token |
| POST | /api/notifications/send | Yes | Send a notification to a user |

### Backend Service

The `notifications` service provides two functions:

```typescript
import {
  sendPushNotification,
  sendMultiplePushNotifications,
} from "./services/notifications.js";

// Send to a single device
await sendPushNotification(token, "Title", "Body", { route: "/notifications" });

// Send to multiple devices
await sendMultiplePushNotifications(tokens, "Title", "Body");
```

### Frontend Hook

```tsx
import { usePushNotifications } from "@/hooks/usePushNotifications";

function MyComponent() {
  const { isRegistered, permissionStatus, register, unregister } =
    usePushNotifications();

  return (
    <div>
      <p>Permission: {permissionStatus}</p>
      <p>Registered: {isRegistered ? "Yes" : "No"}</p>
      <button onClick={register}>Enable Notifications</button>
      <button onClick={unregister}>Disable Notifications</button>
    </div>
  );
}
```

### PushNotificationInit Component

The `<PushNotificationInit />` component is placed in `Layout.tsx` and silently handles push registration on app mount. It renders nothing visible.

### Deep Linking

When a user taps a notification, the hook checks for a `route` field in the notification data payload and navigates to it:

```typescript
// When sending a notification, include a route:
await sendPushNotification(token, "New Message", "You have a new message", {
  route: "/messages/123",
});
```

## Testing

Push notifications **only work on physical devices**, not simulators or emulators.

### Sending Test Notifications

1. **Firebase Console**: Go to Messaging > Create your first campaign > Notifications
2. **API endpoint**: `POST /api/notifications/send` with body:
   ```json
   {
     "userId": "user-id-here",
     "title": "Test Notification",
     "body": "This is a test push notification",
     "data": { "route": "/profile" }
   }
   ```

### Debugging

- Check the browser/device console for registration logs
- Check server logs for firebase-admin errors
- Verify the FCM token is stored in the `push_tokens` table
- Make sure APNs (iOS) or google-services.json (Android) are configured correctly
