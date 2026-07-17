import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import ConversionRequest from "../models/ConversionRequest";
import { nextSequence } from "../helpers/sequence";
import {
  sendConversionConfirmationMail,
  sendConversionNotificationMail,
} from "./nodemailer/mail.service";
import {
  ISubmitConversionRequest,
  IUpdateConversionStatus,
  IConversionsQuery,
} from "../interfaces/conversion.interface";

const NOTIFICATION_EMAIL =
  process.env.CONTACT_NOTIFICATION_EMAIL || "info@kgrpartnersltd.com";
const CONSOLE_URL =
  process.env.CONSOLE_URL || "https://admin.kgrpartnersltd.com";
const CONVERSION_ID_START = Number(process.env.CONVERSION_ID_START) || 100;

// POST /api/conversions: public. Stores the sheet, then fires the
// confirmation (to the requester) and the console pointer (to us)
// without blocking the response.
export const submitConversionService = async (
  payload: ISubmitConversionRequest,
) => {
  const requestId = await nextSequence("conversion_id", CONVERSION_ID_START);

  // keep only answered fields; empty sections are dropped entirely
  const sections = (payload.sections || [])
    .map((section) => ({
      title: section.title,
      fields: section.fields.filter((f) => f.value.trim() !== ""),
    }))
    .filter((section) => section.fields.length > 0);

  const doc = await ConversionRequest.create({
    requestId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || "",
    remarks: payload.remarks || "",
    sections,
  });

  const answered = sections.reduce((acc, s) => acc + s.fields.length, 0);

  void sendConversionConfirmationMail(payload.email, {
    name: payload.name,
    requestId,
  });
  void sendConversionNotificationMail(NOTIFICATION_EMAIL, {
    requestId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || "",
    remarks: payload.remarks || "",
    answered,
    consoleUrl: `${CONSOLE_URL}/conversions`,
  });

  return new ApiResponse(201, "Conversion sheet received", {
    id: String(doc._id),
    requestId,
  });
};

// GET /api/conversions (managers)
export const getConversionsService = async (query: IConversionsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const term = query.search.trim();
    const pattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, any>[] = [
      { name: pattern },
      { email: pattern },
      { phone: pattern },
    ];
    if (/^\d+$/.test(term)) or.push({ requestId: Number(term) });
    filter.$or = or;
  }

  const [requests, totalItems] = await Promise.all([
    ConversionRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("handledBy", "firstName lastName"),
    ConversionRequest.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    requests.map((r) => r.toJSON()),
    totalItems,
    page,
    pageSize,
    "Conversion requests retrieved successfully",
  );
};

// PATCH /api/conversions/:id/status (managers)
export const updateConversionStatusService = async (
  id: string,
  payload: IUpdateConversionStatus,
  by: string,
) => {
  const request = await ConversionRequest.findById(id);
  if (!request) throw new ApiError(404, "Conversion request not found");

  request.status = payload.status;
  request.handledBy = by as any;
  request.handledAt = new Date();
  if (payload.note !== undefined) request.adminNote = payload.note;
  await request.save();
  await request.populate("handledBy", "firstName lastName");

  return new ApiResponse(
    200,
    `Request #${request.requestId} marked ${payload.status.replace("_", " ")}`,
    request.toJSON(),
  );
};
