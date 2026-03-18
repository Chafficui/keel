import { Resend } from "resend";
import { env } from "../env.js";

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
    console.log(`\n📧 Email (dev mode — not sent):`);
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   HTML: ${options.html.substring(0, 200)}...\n`);
    return;
  }

  await resend.emails.send({
    from: env.EMAIL_FROM,
    ...options,
  });
}
