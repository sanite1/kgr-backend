import ApiResponse from "../errors/apiResponse";
import ApiError from "../errors/apiError";
import Company from "../models/Company";
import ContactMessage from "../models/ContactMessage";
import { ISubmitContactRequest } from "../interfaces/contact.interface";
import {
  sendContactNotificationMail,
  sendContactAutoReplyMail,
} from "./nodemailer/mail.service";

// POST /api/contact/:companyId: public, stores the message and fires the
// notification + auto-reply emails without blocking the response.
export const submitContactService = async (
  companyId: string,
  payload: ISubmitContactRequest,
) => {
  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, "Company not found");
  if (!company.isActive) {
    throw new ApiError(
      403,
      "This company is not accepting messages at the moment",
    );
  }

  const doc = await ContactMessage.create({
    companyId: company._id,
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
  void sendContactNotificationMail(company.email, {
    companyName: company.name,
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
