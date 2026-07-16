import ApiResponse from "../errors/apiResponse";
import ContactMessage from "../models/ContactMessage";
import { ISubmitContactRequest } from "../interfaces/contact.interface";
import {
  sendContactNotificationMail,
  sendContactAutoReplyMail,
} from "./nodemailer/mail.service";

const NOTIFICATION_EMAIL =
  process.env.CONTACT_NOTIFICATION_EMAIL || "info@kgrpartnersltd.com";

// POST /api/contact: public, stores the message and fires the
// notification + auto-reply emails without blocking the response.
export const submitContactService = async (payload: ISubmitContactRequest) => {
  const doc = await ContactMessage.create({
    name: payload.name,
    email: payload.email,
    phone: payload.phone || "",
    subject: payload.subject || "",
    message: payload.message,
    metadata: payload.metadata || {},
  });

  // each metadata key/value becomes a labeled row in the notification email;
  // non-primitive values are JSON-stringified
  const rows = Object.entries(payload.metadata || {}).map(([label, value]) => ({
    label,
    value: typeof value === "object" ? JSON.stringify(value) : String(value),
  }));

  // fire-and-forget: a 201 means the message was STORED, not delivered
  void sendContactNotificationMail(NOTIFICATION_EMAIL, {
    name: payload.name,
    email: payload.email,
    phone: payload.phone || "",
    subject: payload.subject || "",
    message: payload.message,
    rows,
  });
  void sendContactAutoReplyMail(payload.email, { name: payload.name });

  return new ApiResponse(201, "Message received", { id: String(doc._id) });
};
