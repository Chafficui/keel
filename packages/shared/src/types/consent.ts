export const CONSENT_TYPES = [
  "privacy_policy",
  "terms_of_service",
  "marketing_emails",
  "analytics",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  ipAddress: string | null;
  userAgent: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
}

export interface ConsentInput {
  consentType: ConsentType;
  granted: boolean;
  version: string;
}
