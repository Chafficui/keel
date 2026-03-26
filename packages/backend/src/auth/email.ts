import { render } from "@react-email/render";
import { z } from "zod";
import {
  VerificationEmail,
  WelcomeEmail,
  PasswordResetEmail,
  AccountDeletionRequestedEmail,
  AccountDeletionCompletedEmail,
  AccountDeletionCancelledEmail,
  DataExportReadyEmail,
  ConsentUpdatedEmail,
} from "@keel/email";
import { sendEmail } from "../services/email.js";
import { env } from "../env.js";

const emailSchema = z.string().email();
const urlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), "URL must use http or https");

/** Resolve the frontend base URL at runtime from environment config. */
function getBaseUrl(): string {
  return env.FRONTEND_URL;
}

export async function sendVerificationEmail(
  email: string,
  url: string,
): Promise<void> {
  emailSchema.parse(email);
  urlSchema.parse(url);
  const html = await render(VerificationEmail({ verificationUrl: url }));
  await sendEmail({ to: email, subject: "Verify your email address", html });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<void> {
  emailSchema.parse(email);
  const html = await render(WelcomeEmail({ userName: name, baseUrl: getBaseUrl() }));
  await sendEmail({ to: email, subject: "Welcome to Keel!", html });
}

export async function sendPasswordResetEmail(
  email: string,
  url: string,
): Promise<void> {
  emailSchema.parse(email);
  urlSchema.parse(url);
  const html = await render(PasswordResetEmail({ resetUrl: url }));
  await sendEmail({ to: email, subject: "Reset your password", html });
}

export async function sendDeletionRequestedEmail(
  email: string,
  userName: string,
  scheduledDeletionDate: string,
  cancelUrl: string,
): Promise<void> {
  emailSchema.parse(email);
  urlSchema.parse(cancelUrl);
  const html = await render(
    AccountDeletionRequestedEmail({ userName, scheduledDeletionDate, cancelUrl }),
  );
  await sendEmail({ to: email, subject: "Your account deletion has been scheduled", html });
}

export async function sendDeletionCompletedEmail(
  email: string,
  userName: string,
): Promise<void> {
  emailSchema.parse(email);
  const html = await render(AccountDeletionCompletedEmail({ userName, baseUrl: getBaseUrl() }));
  await sendEmail({ to: email, subject: "Your account has been deleted", html });
}

export async function sendDeletionCancelledEmail(
  email: string,
  userName: string,
  dashboardUrl: string,
): Promise<void> {
  emailSchema.parse(email);
  urlSchema.parse(dashboardUrl);
  const html = await render(
    AccountDeletionCancelledEmail({ userName, dashboardUrl }),
  );
  await sendEmail({ to: email, subject: "Account deletion cancelled", html });
}

export async function sendDataExportReadyEmail(
  email: string,
  userName: string,
  downloadUrl: string,
  expiresIn: string,
): Promise<void> {
  emailSchema.parse(email);
  urlSchema.parse(downloadUrl);
  const html = await render(
    DataExportReadyEmail({ userName, downloadUrl, expiresIn }),
  );
  await sendEmail({ to: email, subject: "Your data export is ready", html });
}

export async function sendConsentUpdatedEmail(
  email: string,
  userName: string,
  changes: Array<{ type: string; action: "granted" | "revoked" }>,
): Promise<void> {
  emailSchema.parse(email);
  const html = await render(ConsentUpdatedEmail({ userName, changes, baseUrl: getBaseUrl() }));
  await sendEmail({ to: email, subject: "Your privacy preferences have been updated", html });
}
