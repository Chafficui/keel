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

interface WelcomeEmailProps {
  userName: string;
}

const baseUrl = process.env["FRONTEND_URL"] || "http://localhost:5173";

export function WelcomeEmail({ userName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            {/* Replace with your logo */}
            <Text style={logoText}>Your App</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Welcome, {userName}!
            </Heading>

            <Text style={paragraph}>
              We&apos;re excited to have you on board. Your account is all set
              up and ready to go.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={`${baseUrl}/dashboard`}>
                Go to Dashboard
              </Button>
            </Section>

            <Text style={secondaryText}>
              If you have any questions, feel free to reach out to our support
              team. We&apos;re here to help!
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

WelcomeEmail.PreviewProps = {
  userName: "Felix",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;

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
