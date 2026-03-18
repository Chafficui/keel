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

interface AccountDeletionCancelledEmailProps {
  userName: string;
  dashboardUrl: string;
}

export function AccountDeletionCancelledEmail({
  userName,
  dashboardUrl,
}: AccountDeletionCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Account deletion cancelled</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            {/* Replace with your logo */}
            <Text style={logoText}>Your App</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Deletion Cancelled
            </Heading>

            <Text style={paragraph}>
              Hi {userName}, good news! Your account deletion request has been
              successfully cancelled. Your account is safe and all your data
              remains intact.
            </Text>

            <Text style={paragraph}>
              You can continue using your account as usual. No further action is
              needed on your part.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>

            <Text style={secondaryText}>
              If you did not cancel this request, please contact our support
              team immediately.
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

AccountDeletionCancelledEmail.PreviewProps = {
  userName: "Felix",
  dashboardUrl: "http://localhost:5173/dashboard",
} satisfies AccountDeletionCancelledEmailProps;

export default AccountDeletionCancelledEmail;

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
