import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Payment from "../models/Payment";
import Receipt from "../models/Receipt";
import { dayString } from "../helpers/day";
import {
  IPayReceiptRequest,
  IPaymentsQuery,
  IDailyAccountQuery,
  IExportPaymentsQuery,
} from "../interfaces/payment.interface";

// POST /api/payments: collect full payment for a receipt
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

  const payment = await Payment.create({
    receipt: receipt._id,
    amount: receipt.expectedAmount,
    method: "cash",
    collectedBy,
    date: dayString(),
    receiptDate: receipt.date,
  });

  receipt.status = "paid";
  receipt.paidAt = new Date();
  receipt.paidBy = collectedBy as any;
  await receipt.save();

  return new ApiResponse(201, `Receipt #${receipt.billId} marked paid`, {
    payment: payment.toJSON(),
    receipt: receipt.toJSON(),
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
  requesterId: string,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.date) filter.date = query.date;
  const collector = resolveCollector(query.collectedBy, requesterId);
  if (collector) filter.collectedBy = collector;

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

// GET /api/payments/daily-account: the reconciliation ledger for one day
export const getDailyAccountService = async (query: IDailyAccountQuery) => {
  const date = query.date || dayString();

  const [receiptAgg, payments] = await Promise.all([
    Receipt.aggregate([
      { $match: { date } },
      {
        $group: {
          _id: null,
          issuedCount: {
            $sum: { $cond: [{ $ne: ["$status", "void"] }, 1, 0] },
          },
          expected: {
            $sum: {
              $cond: [
                { $ne: ["$status", "void"] },
                { $toDouble: "$expectedAmount" },
                0,
              ],
            },
          },
        },
      },
    ]),
    Payment.find({ date })
      .sort({ createdAt: -1 })
      .limit(2000)
      .populate("receipt", "billId ticketId busNumber date")
      .populate("collectedBy", "firstName lastName"),
  ]);

  const receipts = receiptAgg[0] || { issuedCount: 0, expected: 0 };

  let collectedTotal = 0;
  let collectedFromToday = 0;
  let collectedFromArrears = 0;
  const cashierMap = new Map<
    string,
    { name: string; count: number; amount: number }
  >();

  for (const p of payments) {
    const amount = Number(p.amount);
    collectedTotal += amount;
    if (p.receiptDate === date) collectedFromToday += amount;
    else collectedFromArrears += amount;

    const collector = p.collectedBy as any;
    const id = String(collector?._id ?? collector);
    const name = collector?.firstName
      ? `${collector.firstName} ${collector.lastName}`
      : "Unknown";
    const entry = cashierMap.get(id) || { name, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += amount;
    cashierMap.set(id, entry);
  }

  return new ApiResponse(200, "Daily account retrieved successfully", {
    date,
    receiptsIssued: receipts.issuedCount,
    expectedAmount: String(receipts.expected),
    collectedTotal: String(collectedTotal),
    collectedFromToday: String(collectedFromToday),
    collectedFromArrears: String(collectedFromArrears),
    outstandingToday: String(receipts.expected - collectedFromToday),
    cashiers: Array.from(cashierMap.entries()).map(([id, c]) => ({
      id,
      name: c.name,
      count: c.count,
      amount: String(c.amount),
    })),
    payments: payments.map((p) => p.toJSON()),
  });
};

// GET /api/payments/export: CSV of a day's collections (optionally one cashier)
export const exportPaymentsCsvService = async (
  query: IExportPaymentsQuery,
  requesterId: string,
): Promise<{ filename: string; csv: string }> => {
  const date = query.date || dayString();
  const filter: Record<string, any> = { date };
  const collector = resolveCollector(query.collectedBy, requesterId);
  if (collector) filter.collectedBy = collector;

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
        escape(
          collector?.firstName
            ? `${collector.firstName} ${collector.lastName}`
            : "",
        ),
        escape(p.createdAt ? new Date(p.createdAt).toISOString() : ""),
      ].join(","),
    );
  }
  rows.push(["", "", "", "TOTAL", escape(String(total)), "", ""].join(","));

  return { filename: `kgr-collections-${date}.csv`, csv: rows.join("\n") };
};
