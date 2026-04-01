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
import { sanitizeUrl } from "./utils.js";

interface WelcomeEmailProps {
  userName: string;
  baseUrl?: string;
}

export function WelcomeEmail({
  userName,
  baseUrl: rawBaseUrl = "http://localhost:5173",
}: WelcomeEmailProps) {
  const baseUrl = sanitizeUrl(rawBaseUrl);
  return (
    <Html>
      <Head />
      <Preview>Welcome!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Keel</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Welcome, {userName}!
            </Heading>

            <Text style={paragraph}>
              We&apos;re excited to have you on board. Your account is all set up and ready to go.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={`${baseUrl}/dashboard`}>
                Go to Dashboard
              </Button>
            </Section>

            <Text style={secondaryText}>
              If you have any questions, feel free to reach out to our support team. We&apos;re here
              to help!
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

WelcomeEmail.PreviewProps = {
  userName: "Felix",
  baseUrl: "http://localhost:5173",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;

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
