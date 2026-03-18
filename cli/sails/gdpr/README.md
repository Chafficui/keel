# GDPR/DSGVO Compliance Sail

Adds full GDPR (General Data Protection Regulation) compliance to your keel application, including consent tracking, data export, account deletion, and a privacy policy page.

## Features

- Consent tracking for privacy policy, terms of service, marketing, and analytics
- Consent checkboxes on the signup form
- Consent management toggles in account settings
- Data export (download all personal data as JSON)
- Account deletion with 30-day grace period
- Immediate account deletion with password confirmation
- Cron endpoint for processing scheduled deletions
- Privacy policy page
- GDPR-compliant email notifications

## Prerequisites

- A running keel project with authentication configured
- A cron service for processing scheduled deletions (e.g., cron-job.org, Vercel Cron, Railway Cron)

## Installation

```bash
npx tsx sails/gdpr/install.ts
```

The installer will guide you through the setup, including generating a secret for the deletion cron endpoint.

## Environment Variables

```env
DELETION_CRON_SECRET=your-secure-cron-secret
```

## Architecture

### Database Schema

**consent_records**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | text | FK to users table |
| consent_type | varchar(50) | Type of consent (privacy_policy, tos, marketing, analytics) |
| granted | boolean | Whether consent was granted |
| version | varchar(20) | Version of the policy |
| ip_address | text | IP address at time of consent |
| user_agent | text | User agent at time of consent |
| granted_at | timestamp | When consent was granted |
| revoked_at | timestamp | When consent was revoked (null if active) |

**deletion_requests**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | text | FK to users table |
| status | varchar(20) | pending, cancelled, completed |
| reason | text | User-provided reason for deletion |
| requested_at | timestamp | When deletion was requested |
| scheduled_deletion_at | timestamp | When deletion will be executed (30 days) |
| cancelled_at | timestamp | When deletion was cancelled |
| completed_at | timestamp | When deletion was completed |

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/gdpr/export | Yes | Export all user data as JSON |
| POST | /api/gdpr/deletion | Yes | Request account deletion (30-day grace) |
| POST | /api/gdpr/deletion/cancel | Yes | Cancel pending deletion request |
| DELETE | /api/gdpr/account | Yes | Immediately delete account (requires password) |
| GET | /api/gdpr/consents | Yes | Get active user consents |
| POST | /api/gdpr/consents | Yes | Record a new consent |
| DELETE | /api/gdpr/consents/:consentType | Yes | Revoke a specific consent |
| POST | /api/gdpr/process-deletions | Cron | Process expired deletion requests |

### Deletion Flow

1. User requests account deletion from Settings
2. A deletion request is created with a 30-day grace period
3. User receives an email with a link to cancel
4. User can cancel the deletion from Settings at any time
5. A daily cron job processes expired deletion requests
6. When processed, the user's data is permanently deleted (cascading)
7. A final confirmation email is sent

### Immediate Deletion

Users can also request immediate deletion (bypassing the 30-day grace period) by confirming their password. This is useful for users who want their data removed right away.

### Email Templates

The GDPR sail uses these email functions from the email package:

- `sendDeletionRequestedEmail` - Sent when a user requests deletion
- `sendDeletionCompletedEmail` - Sent after data is permanently deleted
- `sendDeletionCancelledEmail` - Sent when a user cancels a deletion request
- `sendDataExportReadyEmail` - Sent when a data export is ready for download
- `sendConsentUpdatedEmail` - Sent when consent preferences are changed

## Frontend Components

### ConsentCheckboxes

Added to the signup form. Requires acceptance of Privacy Policy and Terms of Service before registration. Marketing and analytics consent are optional.

### DataExportButton

A button in Account Settings that triggers a JSON download of all user data.

### AccountDeletionRequest

A section in Account Settings that shows the current deletion status and allows requesting or cancelling deletion.

### PrivacyPolicy Page

A public page at `/privacy-policy` with GDPR-compliant privacy policy content. Customize this for your specific use case.

## Cron Job Setup

Set up a daily cron job to process scheduled deletions:

```bash
# Using curl
curl -X POST https://your-backend.com/api/gdpr/process-deletions \
  -H "x-cron-secret: your-deletion-cron-secret"
```

### Example: cron-job.org

1. Create a new cron job
2. URL: `https://your-backend.com/api/gdpr/process-deletions`
3. Method: POST
4. Header: `x-cron-secret: your-deletion-cron-secret`
5. Schedule: Daily at 2:00 AM

### Example: Vercel Cron

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/gdpr/process-deletions",
    "schedule": "0 2 * * *"
  }]
}
```

## Customization

### Privacy Policy

Edit `packages/frontend/src/pages/PrivacyPolicy.tsx` to match your company's privacy policy. Update:

- Company name and contact information
- Data Protection Officer details
- Specific data processing purposes
- Third-party services used
- Data retention periods

### Consent Types

The default consent types are:
- `privacyPolicy` (required)
- `termsOfService` (required)
- `marketingEmails` (optional)
- `analytics` (optional)

To add custom consent types, modify `ConsentCheckboxes.tsx` and the consent recording logic.

### Grace Period

The default deletion grace period is 30 days. To change this, modify the `requestDeletion` function in `packages/backend/src/services/gdpr.ts`.
