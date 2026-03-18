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

interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Keel</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Reset your password
            </Heading>

            <Text style={paragraph}>
              We received a request to reset the password for your account.
              Click the button below to choose a new password.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={secondaryText}>
              If the button doesn&apos;t work, copy and paste this link into
              your browser:
            </Text>
            <Text style={linkText}>{resetUrl}</Text>

            <Section style={warningSection}>
              <Text style={warningText}>
                This link expires in 1 hour. After that, you&apos;ll need to
                request a new password reset.
              </Text>
            </Section>

            <Text style={ignoreText}>
              If you didn&apos;t request this, you can safely ignore this email.
              Your password will remain unchanged.
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

PasswordResetEmail.PreviewProps = {
  resetUrl: "http://localhost:5173/reset-password?token=xyz789",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;

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

const secondaryText: React.CSSProperties = {
  color: "#6B7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px 0",
};

const linkText: React.CSSProperties = {
  color: "#2F80FF",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 24px 0",
  wordBreak: "break-all" as const,
};

const warningSection: React.CSSProperties = {
  backgroundColor: "#78350F",
  borderRadius: "6px",
  border: "1px solid #92400E",
  padding: "12px 16px",
  margin: "0 0 24px 0",
};

const warningText: React.CSSProperties = {
  color: "#F59E0B",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const ignoreText: React.CSSProperties = {
  color: "#6B7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 24px 0",
  fontStyle: "italic",
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
