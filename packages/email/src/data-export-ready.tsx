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

interface DataExportReadyEmailProps {
  userName: string;
  downloadUrl: string;
  expiresIn: string;
}

const baseUrl = process.env["FRONTEND_URL"] || "http://localhost:5173";

export function DataExportReadyEmail({
  userName,
  downloadUrl,
  expiresIn,
}: DataExportReadyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your data export is ready</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Keel</Text>
          </Section>

          <Hr style={hr} />

          <Section style={contentSection}>
            <Heading as="h1" style={heading}>
              Your Data Export is Ready
            </Heading>

            <Text style={paragraph}>
              Hi {userName}, the data export you requested is now ready for
              download. The export contains a complete copy of your personal
              data stored in our systems.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={downloadUrl}>
                Download Your Data
              </Button>
            </Section>

            <Section style={warningSection}>
              <Text style={warningText}>
                This download link will expire in {expiresIn}. Please download
                your data before the link expires.
              </Text>
            </Section>

            <Text style={paragraph}>
              Your export includes the following data:
            </Text>

            <Text style={listItem}>&bull; Profile and personal information</Text>
            <Text style={listItem}>&bull; Consent and privacy preferences</Text>
            <Text style={listItem}>&bull; Account activity and session history</Text>

            <Text style={secondaryText}>
              If you did not request this export, please secure your account by
              changing your password immediately.
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

DataExportReadyEmail.PreviewProps = {
  userName: "Felix",
  downloadUrl: "http://localhost:5173/api/gdpr/export/download?token=abc123",
  expiresIn: "24 hours",
} satisfies DataExportReadyEmailProps;

export default DataExportReadyEmail;

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
