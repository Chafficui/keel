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

interface ConsentChange {
  type: string;
  action: "granted" | "revoked";
}

interface ConsentUpdatedEmailProps {
  userName: string;
  changes: ConsentChange[];
}

const baseUrl = process.env["FRONTEND_URL"] || "http://localhost:5173";

export function ConsentUpdatedEmail({
  userName,
  changes,
}: ConsentUpdatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your privacy preferences have been updated</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            {/* Replace with your logo */}
            <Text style={logoText}>Your App</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Privacy Preferences Updated
            </Heading>

            <Text style={paragraph}>
              Hi {userName}, this is to confirm that your privacy preferences
              have been updated. Here&apos;s a summary of the changes:
            </Text>

            {changes.map((change, index) => (
              <Text key={index} style={listItem}>
                &bull; {change.type}:{" "}
                <span
                  style={
                    change.action === "granted" ? grantedBadge : revokedBadge
                  }
                >
                  {change.action}
                </span>
              </Text>
            ))}

            <Text style={timestampText}>
              Updated on {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>

            <Section style={buttonSection}>
              <Button
                style={button}
                href={`${baseUrl}/settings/privacy`}
              >
                Manage Preferences
              </Button>
            </Section>

            <Text style={secondaryText}>
              These changes take effect immediately. You can update your
              preferences at any time from your account settings.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Your App. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ConsentUpdatedEmail.PreviewProps = {
  userName: "Felix",
  changes: [
    { type: "Marketing emails", action: "revoked" },
    { type: "Analytics", action: "granted" },
  ],
} satisfies ConsentUpdatedEmailProps;

export default ConsentUpdatedEmail;

const body: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  margin: "40px auto",
  maxWidth: "560px",
  padding: "0",
};

const logoSection: React.CSSProperties = {
  padding: "32px 40px 0 40px",
  textAlign: "center" as const,
};

const logoText: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: 700,
  margin: "0",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  borderTop: "1px solid #e5e7eb",
  margin: "24px 40px",
};

const contentSection: React.CSSProperties = {
  padding: "0 40px",
};

const heading: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: "32px",
  margin: "0 0 16px 0",
  textAlign: "center" as const,
};

const paragraph: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px 0",
};

const listItem: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 4px 16px",
};

const grantedBadge: React.CSSProperties = {
  color: "#166534",
  fontWeight: 600,
};

const revokedBadge: React.CSSProperties = {
  color: "#991b1b",
  fontWeight: 600,
};

const timestampText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "16px 0",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: "100%",
  padding: "14px 32px",
  textDecoration: "none",
  textAlign: "center" as const,
};

const secondaryText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 24px 0",
};

const footerSection: React.CSSProperties = {
  padding: "0 40px 32px 40px",
};

const footerText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0",
  textAlign: "center" as const,
};
