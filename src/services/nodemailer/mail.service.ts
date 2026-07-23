import ApiError from "../../errors/apiError";
import { IUser } from "../../interfaces/user.interface";
import transporter from "./nodemailer";
import logger from "../../config/logger";
import { inBackground } from "../../helpers/background";

// admin/console-side emails link here, NOT to the public website
const CONSOLE_URL =
  process.env.CONSOLE_URL || "https://admin.kgrpartnersltd.com";
const FROM = `"KGR Partners" <${process.env.SMTP_USER}>`;

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

// The ONE choke point. Everything else is a thin wrapper over this.
// The actual send is registered with the serverless runtime (see
// inBackground) so fire-and-forget callers survive function suspension.
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

  const task = (async () => {
    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Email sent: "${subject}" to ${to}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to send email: "${subject}" to ${to}`, {
        error: msg,
      });
      if (throwOnError) throw new ApiError(500, `Error sending email: ${msg}`);
      // else swallow: a failed email never breaks the calling flow
    }
  })();

  inBackground(task.catch(() => undefined));
  return task;
};

// One wrapper per template:
// password is the plaintext starting password, shown once so the new
// user can sign in; the template urges changing it after first login.
export const sendWelcomeMail = async (user: IUser, password: string) => {
  await sendTemplateMail(
    user.email,
    "Your KGR Partners account is ready",
    "./welcome",
    {
      name: user.firstName,
      email: user.email,
      password,
      role: user.role,
      dashboardUrl: CONSOLE_URL,
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

export const sendConversionConfirmationMail = async (
  senderEmail: string,
  context: { name: string; requestId: number },
) => {
  await sendTemplateMail(
    senderEmail,
    `We've received your conversion sheet (#${context.requestId}): KGR Partners`,
    "./conversionconfirmation",
    context,
  );
};

export const sendConversionNotificationMail = async (
  notificationEmail: string,
  context: {
    requestId: number;
    name: string;
    email: string;
    phone: string;
    remarks: string;
    answered: number;
    consoleUrl: string;
  },
) => {
  await sendTemplateMail(
    notificationEmail,
    `New conversion request #${context.requestId} from ${context.name}`,
    "./conversionnotification",
    context,
  );
};

// Action notices below all share the generic ./notice template.

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  storekeeper: "Storekeeper",
  staff: "Staff",
};

interface NoticeContext {
  title: string;
  name?: string;
  intro: string;
  rows?: { label: string; value: string }[];
  note?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

const sendNoticeMail = async (
  to: string,
  subject: string,
  context: NoticeContext,
) => {
  await sendTemplateMail(to, subject, "./notice", context);
};

// account disabled or re-enabled by an admin
export const sendAccountStatusMail = async (user: IUser) => {
  if (user.isActive) {
    await sendNoticeMail(
      user.email,
      "Your KGR Partners account is active again",
      {
        title: "Your account has been re-enabled",
        name: user.firstName,
        intro:
          "An administrator has re-enabled your KGR Partners management account. You can sign in as usual.",
        ctaLabel: "Open the dashboard",
        ctaUrl: CONSOLE_URL,
      },
    );
  } else {
    await sendNoticeMail(
      user.email,
      "Your KGR Partners account has been disabled",
      {
        title: "Your account has been disabled",
        name: user.firstName,
        intro:
          "An administrator has disabled your KGR Partners management account, so you can no longer sign in. If you believe this is a mistake, please contact your administrator.",
      },
    );
  }
};

// access level changed by an admin
export const sendRoleChangeMail = async (user: IUser, previousRole: string) => {
  await sendNoticeMail(user.email, "Your KGR Partners access level changed", {
    title: "Your access level has changed",
    name: user.firstName,
    intro:
      "An administrator has updated what your KGR Partners account can do. Sign in again to see your new view of the console.",
    rows: [
      {
        label: "Previous level",
        value: ROLE_LABELS[previousRole] || previousRole,
      },
      { label: "New level", value: ROLE_LABELS[user.role] || user.role },
    ],
    ctaLabel: "Open the dashboard",
    ctaUrl: CONSOLE_URL,
  });
};

// self-service password change: a security heads-up
export const sendPasswordChangedMail = async (user: IUser) => {
  await sendNoticeMail(user.email, "Your KGR Partners password was changed", {
    title: "Your password was changed",
    name: user.firstName,
    intro:
      "The password on your KGR Partners management account was just changed. If this was you, no action is needed.",
    note: "If you did NOT make this change, contact your administrator immediately so they can secure your account.",
  });
};

// a part request the person raised was approved or declined
export const sendRequestDecisionMail = async (
  to: string,
  context: {
    name: string;
    requestId: number;
    itemName: string;
    quantity: number;
    busNumber: string;
    approved: boolean;
    note?: string;
  },
) => {
  const outcome = context.approved ? "approved" : "declined";
  await sendNoticeMail(to, `Part request #${context.requestId} ${outcome}`, {
    title: `Request #${context.requestId} ${outcome}`,
    name: context.name,
    intro: context.approved
      ? "Your part request has been approved and the stock has been issued."
      : "Your part request has been declined.",
    rows: [
      { label: "Item", value: `${context.itemName} × ${context.quantity}` },
      { label: "Bus", value: context.busNumber },
    ],
    note: context.note || undefined,
    ctaLabel: "View requests",
    ctaUrl: `${CONSOLE_URL}/requests`,
  });
};

// a repair job the person opened was completed or cancelled
export const sendRepairClosedMail = async (
  to: string,
  context: {
    name: string;
    jobId: number;
    title: string;
    completed: boolean;
    totalCost: string;
    note?: string;
  },
) => {
  const outcome = context.completed ? "completed" : "cancelled";
  await sendNoticeMail(to, `Repair #${context.jobId} ${outcome}`, {
    title: `Repair #${context.jobId} ${outcome}`,
    name: context.name,
    intro: context.completed
      ? "A repair job you opened has been completed and priced."
      : "A repair job you opened has been cancelled and its parts returned to stock.",
    rows: [
      { label: "Job", value: context.title },
      ...(context.completed
        ? [{ label: "Total cost", value: `NGN ${context.totalCost}` }]
        : []),
    ],
    note: context.note || undefined,
    ctaLabel: "View repairs",
    ctaUrl: `${CONSOLE_URL}/repairs`,
  });
};

// stock crossed its low-stock threshold: nudge the operations inbox
export const sendLowStockMail = async (
  notificationEmail: string,
  context: {
    itemName: string;
    quantity: number;
    unit: string;
    minLevel: number;
  },
) => {
  await sendNoticeMail(notificationEmail, `Low stock: ${context.itemName}`, {
    title: "An item is running low",
    intro: `"${context.itemName}" has dropped to or below its low-stock level. Consider restocking before it runs out.`,
    rows: [
      {
        label: "In stock",
        value: `${context.quantity} ${context.unit}`,
      },
      {
        label: "Alert level",
        value: `${context.minLevel} ${context.unit}`,
      },
    ],
    ctaLabel: "Open inventory",
    ctaUrl: `${CONSOLE_URL}/inventory`,
  });
};

// partnership / investor form (public website)
export const sendPartnershipConfirmationMail = async (
  senderEmail: string,
  context: { name: string; requestId: number },
) => {
  await sendNoticeMail(
    senderEmail,
    `We've received your partnership form (#${context.requestId}): KGR Partners`,
    {
      title: "Thank you for your interest",
      name: context.name,
      intro:
        `Your partner / investor information form (#${context.requestId}) has been received. ` +
        "Our team will follow up to schedule an introductory call and begin our standard verification process.",
    },
  );
};

export const sendPartnershipNotificationMail = async (
  notificationEmail: string,
  context: {
    requestId: number;
    kind: string;
    name: string;
    email: string;
    phone: string;
    answered: number;
    consoleUrl: string;
  },
) => {
  await sendNoticeMail(
    notificationEmail,
    `New partnership form #${context.requestId} from ${context.name}`,
    {
      title: `Partnership form #${context.requestId}`,
      intro: "A new partner / investor form arrived from the website.",
      rows: [
        { label: "Type", value: context.kind },
        { label: "Name", value: context.name },
        { label: "Email", value: context.email },
        { label: "Phone", value: context.phone || "-" },
        { label: "Answered fields", value: String(context.answered) },
      ],
      ctaLabel: "Open in the console",
      ctaUrl: context.consoleUrl,
    },
  );
};
