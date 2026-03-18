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

interface AccountDeletionCompletedEmailProps {
  userName: string;
}

const baseUrl = process.env["FRONTEND_URL"] || "http://localhost:5173";

export function AccountDeletionCompletedEmail({
  userName,
}: AccountDeletionCompletedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your account has been deleted</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Keel</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Account Deleted
            </Heading>

            <Text style={paragraph}>
              Hi {userName}, this is to confirm that your account and all
              associated data have been permanently deleted from our systems in
              compliance with GDPR regulations.
            </Text>

            <Text style={paragraph}>
              The following data has been removed:
            </Text>

            <Text style={listItem}>&bull; Your profile and personal information</Text>
            <Text style={listItem}>&bull; All session and authentication data</Text>
            <Text style={listItem}>&bull; Your consent and preference records</Text>
            <Text style={listItem}>&bull; All activity and usage history</Text>

            <Text style={paragraph}>
              We&apos;re sorry to see you go. If you ever wish to return, you
              are welcome to create a new account at any time.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={`${baseUrl}/signup`}>
                Create a New Account
              </Button>
            </Section>

            <Text style={secondaryText}>
              Thank you for being part of our community. We wish you all the best.
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

AccountDeletionCompletedEmail.PreviewProps = {
  userName: "Felix",
} satisfies AccountDeletionCompletedEmailProps;

export default AccountDeletionCompletedEmail;

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

const listItem: React.CSSProperties = {
  color: "#9CA3AF",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 4px 16px",
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
