import ApiError from "../../errors/apiError";
import { IUser } from "../../interfaces/user.interface";
import transporter from "./nodemailer";
import logger from "../../config/logger";

const DOMAIN_NAME = process.env.DOMAIN_NAME || "https://www.kgrpartnersltd.com";
const FROM = `"KGR Partners" <${process.env.SMTP_USER}>`;

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

// The ONE choke point. Everything else is a thin wrapper over this.
const sendTemplateMail = async (
  to: string,
  subject: string,
  template: string, // e.g. "./welcome": relative to viewPath, NO extension
  context: Record<string, any>,
  throwOnError: boolean = false,
  attachments?: MailAttachment[],
) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    logger.warn(`Email skipped (SMTP not configured): "${subject}" to ${to}`);
    return;
  }
  const mailOptions: Record<string, any> = {
    from: FROM,
    to,
    subject,
    template,
    context,
  };
  if (attachments && attachments.length > 0)
    mailOptions.attachments = attachments;
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent: "${subject}" to ${to}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to send email: "${subject}" to ${to}`, { error: msg });
    if (throwOnError) throw new ApiError(500, `Error sending email: ${msg}`);
    // else swallow: a failed email never breaks the calling flow
  }
};

// One wrapper per template:
export const sendWelcomeMail = async (user: IUser) => {
  await sendTemplateMail(
    user.email,
    "Your KGR Partners account is ready",
    "./welcome",
    {
      name: user.firstName,
      email: user.email,
      role: user.role,
      dashboardUrl: DOMAIN_NAME,
    },
  );
};

export const sendContactNotificationMail = async (
  notificationEmail: string,
  context: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    rows: { label: string; value: string }[];
  },
) => {
  await sendTemplateMail(
    notificationEmail,
    `New message from ${context.name}${context.subject ? `: ${context.subject}` : ""}`,
    "./contactnotification",
    context,
  );
};

export const sendContactAutoReplyMail = async (
  senderEmail: string,
  context: { name: string },
) => {
  await sendTemplateMail(
    senderEmail,
    "We've received your message: KGR Partners",
    "./contactautoreply",
    context,
  );
};
