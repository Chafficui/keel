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
            {/* Replace with your logo */}
            <Text style={logoText}>Your App</Text>
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
              &copy; {new Date().getFullYear()} Your App. All rights reserved.
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

const warningSection: React.CSSProperties = {
  backgroundColor: "#fef3c7",
  borderRadius: "6px",
  border: "1px solid #fcd34d",
  padding: "12px 16px",
  margin: "0 0 24px 0",
};

const warningText: React.CSSProperties = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
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
