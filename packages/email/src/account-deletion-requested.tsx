import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
  Heading,
} from "@react-email/components";
import type * as React from "react";

function sanitizeUrl(url: string): string {
  const lower = url.toLowerCase().trim();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  return url;
}

interface AccountDeletionRequestedEmailProps {
  userName: string;
  scheduledDeletionDate: string;
  cancelUrl: string;
}

export function AccountDeletionRequestedEmail({
  userName,
  scheduledDeletionDate,
  cancelUrl: rawCancelUrl,
}: AccountDeletionRequestedEmailProps) {
  const cancelUrl = sanitizeUrl(rawCancelUrl);
  return (
    <Html>
      <Head />
      <Preview>Your account deletion has been scheduled</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Keel</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Account Deletion Scheduled
            </Heading>

            <Text style={paragraph}>
              Hi {userName}, we&apos;ve received your request to delete your
              account. Your account and all associated data are scheduled to be
              permanently deleted on <strong>{scheduledDeletionDate}</strong>.
            </Text>

            <Text style={paragraph}>
              You have a 30-day grace period to change your mind. During this
              time, your account will remain active and you can cancel the
              deletion at any time.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={cancelUrl}>
                Cancel Deletion
              </Button>
            </Section>

            <Section style={dangerSection}>
              <Text style={dangerText}>
                After the grace period ends, all your data will be permanently
                removed. This includes your profile, projects, activity history,
                and any other information associated with your account. This
                action cannot be undone.
              </Text>
            </Section>

            <Text style={secondaryText}>
              If you did not request this, please cancel the deletion
              immediately and secure your account.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Keel &mdash; a codai project
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

AccountDeletionRequestedEmail.PreviewProps = {
  userName: "Felix",
  scheduledDeletionDate: "April 17, 2026",
  cancelUrl: "http://localhost:5173/settings/cancel-deletion?token=abc123",
} satisfies AccountDeletionRequestedEmailProps;

export default AccountDeletionRequestedEmail;

const body: React.CSSProperties = {
  backgroundColor: "#0B1220",
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: "#111827",
  borderRadius: "12px",
  border: "1px solid #1F2937",
  margin: "40px auto",
  maxWidth: "560px",
  padding: "0",
};

const logoSection: React.CSSProperties = {
  padding: "32px 40px 0 40px",
  textAlign: "center" as const,
};

const logoText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 700,
  margin: "0",
  letterSpacing: "-0.025em",
};

const hr: React.CSSProperties = {
  borderColor: "#1F2937",
  borderTop: "1px solid #1F2937",
  margin: "24px 40px",
};

const contentSection: React.CSSProperties = {
  padding: "0 40px",
};

const heading: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: "32px",
  margin: "0 0 16px 0",
  textAlign: "center" as const,
};

const paragraph: React.CSSProperties = {
  color: "#9CA3AF",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 24px 0",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#2F80FF",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: "100%",
  padding: "14px 32px",
  textDecoration: "none",
  textAlign: "center" as const,
};

const dangerSection: React.CSSProperties = {
  backgroundColor: "#7F1D1D",
  borderRadius: "6px",
  border: "1px solid #991B1B",
  padding: "12px 16px",
  margin: "0 0 24px 0",
};

const dangerText: React.CSSProperties = {
  color: "#EF4444",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const secondaryText: React.CSSProperties = {
  color: "#6B7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 24px 0",
};

const footerSection: React.CSSProperties = {
  padding: "0 40px 32px 40px",
};

const footerText: React.CSSProperties = {
  color: "#4B5563",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0",
  textAlign: "center" as const,
};
