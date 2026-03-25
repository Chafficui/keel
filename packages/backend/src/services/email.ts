import { Resend } from "resend";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";

export const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;

/** Send an email via Resend, or log to console in dev if no API key is set */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    logger.debug(
      { to: options.to, subject: options.subject },
      "Email not sent (dev mode, no RESEND_API_KEY)",
    );
    return;
  }

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      ...options,
    });
  } catch (error) {
    logger.error(
      { to: options.to, subject: options.subject, error },
      "Failed to send email via Resend",
    );
  }
}
