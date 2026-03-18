import { render } from "@react-email/render";
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

export async function sendVerificationEmail(
  email: string,
  url: string,
): Promise<void> {
  const html = await render(VerificationEmail({ verificationUrl: url }));
  await sendEmail({ to: email, subject: "Verify your email address", html });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<void> {
  const html = await render(WelcomeEmail({ userName: name }));
  await sendEmail({ to: email, subject: "Welcome to Keel!", html });
}

export async function sendPasswordResetEmail(
  email: string,
  url: string,
): Promise<void> {
  const html = await render(PasswordResetEmail({ resetUrl: url }));
  await sendEmail({ to: email, subject: "Reset your password", html });
}

export async function sendDeletionRequestedEmail(
  email: string,
  userName: string,
  scheduledDeletionDate: string,
  cancelUrl: string,
): Promise<void> {
  const html = await render(
    AccountDeletionRequestedEmail({ userName, scheduledDeletionDate, cancelUrl }),
  );
  await sendEmail({ to: email, subject: "Your account deletion has been scheduled", html });
}

export async function sendDeletionCompletedEmail(
  email: string,
  userName: string,
): Promise<void> {
  const html = await render(AccountDeletionCompletedEmail({ userName }));
  await sendEmail({ to: email, subject: "Your account has been deleted", html });
}

export async function sendDeletionCancelledEmail(
  email: string,
  userName: string,
  dashboardUrl: string,
): Promise<void> {
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
  const html = await render(ConsentUpdatedEmail({ userName, changes }));
  await sendEmail({ to: email, subject: "Your privacy preferences have been updated", html });
}
