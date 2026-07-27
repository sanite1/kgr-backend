import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Payment from "../models/Payment";
import Receipt from "../models/Receipt";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { MANAGERS } from "../config/roles";
import { UserRole } from "../interfaces/helper.interface";
import {
  IPayReceiptRequest,
  IPaymentsQuery,
  IDailyAccountQuery,
  IExportPaymentsQuery,
} from "../interfaces/payment.interface";

// POST /api/payments: collect payment for a receipt. Full amount by
// default; a lower amount is a short payment and must carry a reason,
// which stays on both the payment and the receipt for management.
export const payReceiptService = async (
  payload: IPayReceiptRequest,
  collectedBy: string,
) => {
  const receipt = await Receipt.findById(payload.receiptId);
  if (!receipt) throw new ApiError(404, "Receipt not found");
  if (receipt.status === "void") {
    throw new ApiError(400, "This receipt has been voided");
  }
  if (receipt.status === "paid") {
    throw new ApiError(400, `Receipt #${receipt.billId} is already paid`);
  }

  const expected = Number(receipt.expectedAmount);
  const amount = payload.amount ?? receipt.expectedAmount;
  const amountNum = Number(amount);
  const reason = (payload.reason || "").trim();

  if (!(amountNum > 0)) {
    throw new ApiError(400, "The amount must be more than zero");
  }
  if (amountNum > expected) {
    throw new ApiError(
      400,
      `Receipt #${receipt.billId} expects ${receipt.expectedAmount}; collect at most that`,
    );
  }
  const isShort = amountNum < expected;
  if (isShort && reason.length < 3) {
    throw new ApiError(
      400,
      "A reason is required when collecting less than the expected amount",
    );
  }

  // Atomically claim the receipt: the status guard means only ONE request
  // can flip awaiting -> paid, so a retried or concurrent pay can never
  // create a second payment. findOneAndUpdate also skips whole-document
  // validation, so older receipts save cleanly.
  const claimed = await Receipt.findOneAndUpdate(
    { _id: receipt._id, status: "awaiting_payment" },
    {
      status: "paid",
      paidAt: new Date(),
      paidBy: collectedBy,
      amountPaid: amount,
      payReason: isShort ? reason : "",
    },
    { new: true },
  );
  if (!claimed) {
    throw new ApiError(400, `Receipt #${receipt.billId} is already paid`);
  }

  let payment;
  try {
    payment = await Payment.create({
      receipt: claimed._id,
      amount,
      method: "cash",
      collectedBy,
      date: dayString(),
      receiptDate: claimed.date,
      reason: isShort ? reason : "",
    });
  } catch (err) {
    // release the claim so the receipt can be paid again
    await Receipt.updateOne(
      { _id: claimed._id },
      {
        status: "awaiting_payment",
        $unset: { paidAt: "", paidBy: "", amountPaid: "", payReason: "" },
      },
    );
    throw err;
  }

  return new ApiResponse(201, `Receipt #${claimed.billId} marked paid`, {
    payment: payment.toJSON(),
    receipt: claimed.toJSON(),
  });
};

const resolveCollector = (
  collectedBy: string | undefined,
  requesterId: string,
): string | undefined => {
  if (!collectedBy) return undefined;
  return collectedBy === "me" ? requesterId : collectedBy;
};

// GET /api/payments
export const getPaymentsService = async (
  query: IPaymentsQuery,
  requester: { id: string; role: UserRole },
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.date) filter.date = query.date;
  // non-managers only ever see their OWN collections, whatever they ask
  if (!MANAGERS.includes(requester.role)) {
    filter.collectedBy = requester.id;
  } else {
    const collector = resolveCollector(query.collectedBy, requester.id);
    if (collector) filter.collectedBy = collector;
  }

  const [payments, totalItems] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("receipt", "billId ticketId busNumber date expectedTrips")
      .populate("collectedBy", "firstName lastName"),
    Payment.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    payments.map((p) => p.toJSON()),
    totalItems,
    page,
    pageSize,
    "Payments retrieved successfully",
  );
};

// GET /api/payments/daily-account: the reconciliation ledger for one day.
// Totals and the cashier breakdown are aggregated over EVERY payment of
// the day; only the transaction rows are paginated.
export const getDailyAccountService = async (query: IDailyAccountQuery) => {
  const date = query.date || dayString();
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [receiptAgg, moneyAgg, cashierAgg, totalItems, pagePayments] =
    await Promise.all([
      Receipt.aggregate([
        { $match: { date, status: { $ne: "void" } } },
        {
          $group: {
            _id: null,
            issuedCount: { $sum: 1 },
            expected: { $sum: { $toDouble: "$expectedAmount" } },
            trips: { $sum: { $ifNull: ["$expectedTrips", 0] } },
            buses: { $addToSet: "$busNumber" },
          },
        },
      ]),
      // collected total, split into today's receipts vs arrears
      Payment.aggregate([
        { $match: { date } },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$amount" } },
            fromToday: {
              $sum: {
                $cond: [
                  { $eq: ["$receiptDate", date] },
                  { $toDouble: "$amount" },
                  0,
                ],
              },
            },
          },
        },
      ]),
      // per-cashier totals
      Payment.aggregate([
        { $match: { date } },
        {
          $group: {
            _id: "$collectedBy",
            count: { $sum: 1 },
            amount: { $sum: { $toDouble: "$amount" } },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      Payment.countDocuments({ date }),
      Payment.find({ date })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("receipt", "billId ticketId busNumber date")
        .populate("collectedBy", "firstName lastName"),
    ]);

  const receipts = receiptAgg[0] || {
    issuedCount: 0,
    expected: 0,
    trips: 0,
    buses: [],
  };
  const money = moneyAgg[0] || { total: 0, fromToday: 0 };

  // put names to the cashier ids
  const cashierIds = cashierAgg.map((c: any) => c._id).filter(Boolean);
  const users = await User.find({ _id: { $in: cashierIds } }).select(
    "firstName lastName",
  );
  const nameById = new Map(
    users.map((u) => [String(u._id), `${u.firstName} ${u.lastName}`]),
  );

  return new ApiResponse(200, "Daily account retrieved successfully", {
    date,
    receiptsIssued: receipts.issuedCount,
    trips: Math.round((receipts.trips ?? 0) * 2) / 2,
    busesWorked: (receipts.buses ?? []).length,
    expectedAmount: String(receipts.expected),
    collectedTotal: String(money.total),
    collectedFromToday: String(money.fromToday),
    collectedFromArrears: String(money.total - money.fromToday),
    outstandingToday: String(receipts.expected - money.fromToday),
    cashiers: cashierAgg.map((c: any) => ({
      id: String(c._id),
      name: nameById.get(String(c._id)) || "Unknown",
      count: c.count,
      amount: String(c.amount),
    })),
    payments: pagePayments.map((p) => p.toJSON()),
    pagination: PaginatedResponse.buildPagination(page, pageSize, totalItems),
  });
};

// GET /api/payments/export: CSV of a day's collections (optionally one cashier)
export const exportPaymentsCsvService = async (
  query: IExportPaymentsQuery,
  requester: { id: string; role: UserRole },
): Promise<{ filename: string; csv: string }> => {
  const date = query.date || dayString();
  const filter: Record<string, any> = { date };
  // non-managers export only their own shift
  if (!MANAGERS.includes(requester.role)) {
    filter.collectedBy = requester.id;
  } else {
    const collector = resolveCollector(query.collectedBy, requester.id);
    if (collector) filter.collectedBy = collector;
  }

  const payments = await Payment.find(filter)
    .sort({ createdAt: 1 })
    .limit(5000)
    .populate("receipt", "billId ticketId busNumber date")
    .populate("collectedBy", "firstName lastName");

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    [
      "Bill ID",
      "Ticket ID",
      "Bus",
      "Receipt Date",
      "Amount",
      "Reason",
      "Collected By",
      "Collected At",
    ].join(","),
  ];
  let total = 0;
  for (const p of payments) {
    const receipt = p.receipt as any;
    const collector = p.collectedBy as any;
    total += Number(p.amount);
    rows.push(
      [
        escape(String(receipt?.billId ?? "")),
        escape(String(receipt?.ticketId ?? "")),
        escape(String(receipt?.busNumber ?? "")),
        escape(String(p.receiptDate)),
        escape(String(p.amount)),
        escape(String(p.reason || "")),
        escape(
          collector?.firstName
            ? `${collector.firstName} ${collector.lastName}`
            : "",
        ),
        escape(p.createdAt ? new Date(p.createdAt).toISOString() : ""),
      ].join(","),
    );
  }
  rows.push(["", "", "", "TOTAL", escape(String(total)), "", "", ""].join(","));

  return { filename: `kgr-collections-${date}.csv`, csv: rows.join("\n") };
};
