# GDPR / DSGVO Compliance

This document describes the data protection measures implemented in the keel template and what you need to do to stay compliant when building on top of it.

> **Disclaimer:** This documentation provides technical guidance, not legal advice. Consult a qualified legal professional for your specific jurisdiction and use case.

## Data Collected

### User Data

| Data Point | Purpose | Legal Basis | Retention |
|-----------|---------|-------------|-----------|
| Email address | Authentication, communication | Contract performance | Until account deletion |
| Name | Personalization, display | Contract performance | Until account deletion |
| Hashed password | Authentication | Contract performance | Until account deletion |
| Profile picture | User profile display | Consent | Until removed or account deletion |
| IP address | Session security, abuse prevention | Legitimate interest | Session duration |
| User agent | Session identification | Legitimate interest | Session duration |

### Session Data

| Data Point | Purpose | Legal Basis | Retention |
|-----------|---------|-------------|-----------|
| Session token | Authentication | Contract performance | 7 days (configurable) |
| Session IP | Security auditing | Legitimate interest | Session duration |
| Session user agent | Device identification | Legitimate interest | Session duration |

### Optional Data (Sails)

| Data Point | Source | Purpose | Legal Basis |
|-----------|--------|---------|-------------|
| Google OAuth profile | Google OAuth sail | Social login | Consent |
| Stripe customer ID | Stripe sail | Payment processing | Contract performance |
| Subscription details | Stripe sail | Service delivery | Contract performance |

## Consent Management

### Cookie Consent

The template uses session cookies that are strictly necessary for authentication. Under GDPR, strictly necessary cookies do not require consent. However:

1. **If you add analytics or tracking cookies** (e.g., PostHog, Google Analytics), you MUST implement a cookie consent banner
2. **If you add marketing cookies**, you MUST get explicit opt-in consent before setting them

### Implementation

The template includes a consent management pattern you can extend:

```typescript
// Example consent check before loading analytics
if (hasConsent("analytics")) {
  initializeAnalytics();
}
```

### Third-Party Processors

If you use the Stripe sail, Stripe acts as a data processor. You need:

1. A Data Processing Agreement (DPA) with Stripe (they provide one)
2. Mention of Stripe in your privacy policy
3. Appropriate legal basis (contract performance for payments)

## Data Export

### User Data Export

GDPR Article 15 grants users the right to access their data, and Article 20 grants data portability. The template includes an API endpoint for data export:

```
GET /api/user/export
```

This endpoint returns all user data in JSON format:

```json
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": true,
    "image": "...",
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "sessions": [
    {
      "createdAt": "2025-03-01T08:00:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "accounts": [
    {
      "provider": "credential",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

When you add features that store additional user data, extend this export endpoint to include the new data.

## Account Deletion

### 30-Day Grace Period

GDPR Article 17 grants the right to erasure ("right to be forgotten"). The template implements a soft-delete with a 30-day grace period:

```
┌─────────┐                              ┌─────────┐
│  User   │                              │ Backend │
└────┬────┘                              └────┬────┘
     │ Request account deletion                │
     │ POST /api/user/delete                   │
     │ ────────────────────────────────────────>│
     │                                         │ Mark account as "pending deletion"
     │                                         │ Set deletionScheduledAt = now + 30 days
     │                                         │ Send confirmation email
     │   200 OK                                │
     │ <────────────────────────────────────────│
     │                                         │
     │         ... 30 days pass ...            │
     │                                         │
     │                                         │ Cron job runs
     │                                         │ Find accounts past grace period
     │                                         │ Hard delete all user data
     │                                         │ Delete from Stripe (if applicable)
     │                                         │ Send final confirmation email
```

### What Gets Deleted

On hard deletion, the following data is permanently removed:

1. User record (name, email, profile picture)
2. All sessions
3. All account records (credentials, social logins)
4. All user-generated content (extend as needed)
5. Stripe customer record (if Stripe sail is installed)

### Cancellation

Users can cancel the deletion during the 30-day grace period:

```
POST /api/user/cancel-deletion
```

This clears the `deletionScheduledAt` flag and restores full access.

### Implementation

```typescript
// packages/backend/src/routes/user.ts

// Request deletion
router.post("/delete", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);

  await db
    .update(users)
    .set({ deletionScheduledAt: deletionDate })
    .where(eq(users.id, userId));

  await sendAccountDeletionEmail(req.user!.email, deletionDate);
  await auth.api.signOut({ headers: req.headers });

  res.json({ message: "Account scheduled for deletion", deletionDate });
});

// Cancel deletion
router.post("/cancel-deletion", requireAuth, async (req, res) => {
  await db
    .update(users)
    .set({ deletionScheduledAt: null })
    .where(eq(users.id, req.user!.id));

  res.json({ message: "Deletion cancelled" });
});
```

### Cron Job

Set up a daily cron job to process pending deletions:

```typescript
// Run daily at 2:00 AM
async function processPendingDeletions() {
  const pendingUsers = await db.query.users.findMany({
    where: and(
      isNotNull(users.deletionScheduledAt),
      lte(users.deletionScheduledAt, new Date())
    ),
  });

  for (const user of pendingUsers) {
    await hardDeleteUser(user.id);
    await sendDeletionConfirmationEmail(user.email);
  }
}
```

## Privacy Policy Requirements

Your privacy policy must include:

1. **Identity of the controller** — Your company name and contact details
2. **Data Protection Officer** — If applicable (required for large-scale processing)
3. **What data is collected** — See tables above
4. **Purpose of processing** — Authentication, service delivery, etc.
5. **Legal basis** — Contract, consent, or legitimate interest
6. **Data recipients** — List third parties (Stripe, email provider, etc.)
7. **Data transfers** — If data leaves the EU/EEA
8. **Retention periods** — How long data is kept
9. **User rights** — Access, rectification, erasure, portability, objection
10. **Right to complain** — To the supervisory authority
11. **Cookie policy** — What cookies are used and why

## Staying Compliant When Adding Features

### Checklist for New Features

When adding features that process personal data:

- [ ] **Identify the data** — What personal data does this feature collect?
- [ ] **Define the purpose** — Why is this data needed?
- [ ] **Choose legal basis** — Contract, consent, or legitimate interest?
- [ ] **Implement data minimization** — Collect only what's necessary
- [ ] **Update data export** — Add new data to the `/api/user/export` endpoint
- [ ] **Update deletion** — Ensure new data is deleted with the account
- [ ] **Update privacy policy** — Document the new data processing
- [ ] **Add consent if needed** — For optional features, get explicit consent
- [ ] **Set retention period** — How long is this data kept?
- [ ] **Check third parties** — Does this feature share data with new providers?

### Common Pitfalls

1. **Logging personal data** — Avoid logging emails, names, or IPs in application logs. If you must, set a short retention period.

2. **Analytics without consent** — If you add the analytics sail, implement a consent banner before tracking.

3. **Email marketing** — Never send marketing emails without explicit opt-in. Transactional emails (password reset, verification) are fine.

4. **Storing unnecessary data** — Only collect data you actually need. "We might need it later" is not a valid reason under GDPR.

5. **Forgetting sub-processors** — If you use a new third-party service that processes user data, add a DPA and update your privacy policy.

## DSGVO (German-specific Notes)

If your app targets German users, additional considerations apply:

- The German supervisory authorities (Datenschutzbehoerden) tend to enforce GDPR strictly
- Impressum (legal notice) is required for commercial websites under TMG
- Double opt-in is the standard for email marketing consent in Germany
- Data Processing Agreements (Auftragsverarbeitungsvertraege) are required with all processors
- Cookie consent banners must not use dark patterns (no pre-checked boxes, no "legitimate interest" for tracking)
