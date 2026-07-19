import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Expenditure from "../models/Expenditure";
import ExpenditureCategory from "../models/ExpenditureCategory";
import Bus from "../models/Bus";
import { nextSequence } from "../helpers/sequence";
import { dayString } from "../helpers/day";
import {
  ICreateExpenditureCategory,
  IUpdateExpenditureCategory,
  ICreateExpenditure,
  IUpdateExpenditure,
  IExpendituresQuery,
  IExpenditureSummaryQuery,
  ISourceExpenditure,
} from "../interfaces/expenditure.interface";

const EXPENDITURE_ID_START = Number(process.env.EXPENDITURE_ID_START) || 1;

// ---- Categories (folders) ----

export const getExpenditureCategoriesService = async () => {
  const categories = await ExpenditureCategory.find().sort({ name: 1 });
  return new ApiResponse(
    200,
    "Categories retrieved successfully",
    categories.map((c) => c.toJSON()),
  );
};

export const createExpenditureCategoryService = async (
  payload: ICreateExpenditureCategory,
  createdBy: string,
) => {
  const name = payload.name.trim();
  const existing = await ExpenditureCategory.findOne({
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  if (existing) throw new ApiError(409, `Category "${name}" already exists`);

  const category = await ExpenditureCategory.create({ name, createdBy });
  return new ApiResponse(201, `Category "${name}" added`, category.toJSON());
};

export const updateExpenditureCategoryService = async (
  id: string,
  payload: IUpdateExpenditureCategory,
) => {
  const category = await ExpenditureCategory.findById(id);
  if (!category) throw new ApiError(404, "Category not found");

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    const clash = await ExpenditureCategory.findOne({
      _id: { $ne: category._id },
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (clash) throw new ApiError(409, `Category "${name}" already exists`);
    category.name = name;
  }
  if (payload.isActive !== undefined) category.isActive = payload.isActive;
  await category.save();

  return new ApiResponse(200, "Category updated", category.toJSON());
};

// Resolves the category from either an id or a name (creating the name
// if it is new), so the form can add a folder inline.
const resolveCategory = async (
  categoryId: string | undefined,
  categoryName: string | undefined,
  createdBy: string,
) => {
  if (categoryId) {
    const category = await ExpenditureCategory.findById(categoryId);
    if (!category) throw new ApiError(404, "Category not found");
    return category;
  }
  if (categoryName && categoryName.trim()) {
    const name = categoryName.trim();
    const existing = await ExpenditureCategory.findOne({
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) return existing;
    return ExpenditureCategory.create({ name, createdBy });
  }
  throw new ApiError(400, "A category is required");
};

// ---- Expenditures ----

export const createExpenditureService = async (
  payload: ICreateExpenditure,
  recordedBy: string,
) => {
  const category = await resolveCategory(
    payload.categoryId,
    payload.categoryName,
    recordedBy,
  );

  let bus = null;
  if (payload.busId) {
    bus = await Bus.findById(payload.busId);
    if (!bus) throw new ApiError(404, "Bus not found");
  }

  const expenditureId = await nextSequence(
    "expenditure_id",
    EXPENDITURE_ID_START,
  );

  const expenditure = await Expenditure.create({
    expenditureId,
    date: payload.date || dayString(),
    amount: payload.amount,
    category: category._id,
    categoryName: category.name,
    bus: bus?._id,
    busNumber: bus?.number,
    description: payload.description.trim(),
    note: payload.note || "",
    recordedBy,
  });

  return new ApiResponse(
    201,
    `Expenditure #${expenditureId} recorded`,
    expenditure.toJSON(),
  );
};

// Auto entries (from requests/repairs) are owned by their source and
// must not be hand-edited, or they drift out of sync.
const guardManual = (source: string) => {
  if (source === "part_request" || source === "repair") {
    throw new ApiError(
      400,
      "This entry is generated from its request or repair and updates automatically.",
    );
  }
};

export const updateExpenditureService = async (
  id: string,
  payload: IUpdateExpenditure,
  actingUserId: string,
) => {
  const expenditure = await Expenditure.findById(id);
  if (!expenditure) throw new ApiError(404, "Expenditure not found");
  guardManual(expenditure.source);

  if (payload.categoryId) {
    const category = await resolveCategory(
      payload.categoryId,
      undefined,
      actingUserId,
    );
    expenditure.category = category._id as any;
    expenditure.categoryName = category.name;
  }
  if (payload.busId !== undefined) {
    if (payload.busId === null || payload.busId === "") {
      expenditure.bus = undefined;
      expenditure.busNumber = undefined;
    } else {
      const bus = await Bus.findById(payload.busId);
      if (!bus) throw new ApiError(404, "Bus not found");
      expenditure.bus = bus._id as any;
      expenditure.busNumber = bus.number;
    }
  }
  if (payload.date !== undefined) expenditure.date = payload.date;
  if (payload.amount !== undefined) expenditure.amount = payload.amount;
  if (payload.description !== undefined)
    expenditure.description = payload.description.trim();
  if (payload.note !== undefined) expenditure.note = payload.note;
  await expenditure.save();

  return new ApiResponse(200, "Expenditure updated", expenditure.toJSON());
};

export const deleteExpenditureService = async (id: string) => {
  const expenditure = await Expenditure.findById(id);
  if (!expenditure) throw new ApiError(404, "Expenditure not found");
  guardManual(expenditure.source);
  await expenditure.deleteOne();
  return new ApiResponse(
    200,
    `Expenditure #${expenditure.expenditureId} removed`,
  );
};

const buildFilter = (query: {
  busId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
  status?: string;
  source?: string;
}) => {
  const filter: Record<string, any> = {};
  if (query.busId) filter.bus = query.busId;
  if (query.categoryId) filter.category = query.categoryId;
  if (query.source) filter.source = query.source;
  // cancelled entries (reversed repairs) are hidden and excluded from
  // totals unless explicitly asked for
  if (query.status) filter.status = query.status;
  else filter.status = { $ne: "cancelled" };
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = query.from;
    if (query.to) filter.date.$lte = query.to;
  }
  if (query.search) {
    const pattern = new RegExp(
      query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, any>[] = [
      { description: pattern },
      { busNumber: pattern },
      { categoryName: pattern },
    ];
    if (/^\d+$/.test(query.search.trim())) {
      or.push({ expenditureId: Number(query.search.trim()) });
    }
    filter.$or = or;
  }
  return filter;
};

// GET /api/expenditures: the filtered ledger. Totals and the
// per-category split come from the summary endpoint with the same
// filters, so the search view and its total stay in sync.
export const getExpendituresService = async (query: IExpendituresQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const filter = buildFilter(query);

  const [expenditures, totalItems] = await Promise.all([
    Expenditure.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("recordedBy", "firstName lastName"),
    Expenditure.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    expenditures.map((e) => e.toJSON()),
    totalItems,
    page,
    pageSize,
    "Expenditures retrieved successfully",
  );
};

// GET /api/expenditures/summary: totals split by category and by bus
// over a date range.
export const getExpenditureSummaryService = async (
  query: IExpenditureSummaryQuery,
) => {
  const filter = buildFilter(query);

  const [overall, byCategory, byBus] = await Promise.all([
    Expenditure.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: "$amount" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Expenditure.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$categoryName",
          total: { $sum: { $toDouble: "$amount" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Expenditure.aggregate([
      { $match: { ...filter, bus: { $ne: null } } },
      {
        $group: {
          _id: "$busNumber",
          total: { $sum: { $toDouble: "$amount" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 200 },
    ]),
  ]);

  return new ApiResponse(200, "Expenditure summary retrieved successfully", {
    from: query.from || null,
    to: query.to || null,
    total: String(overall[0]?.total ?? 0),
    count: overall[0]?.count ?? 0,
    byCategory: byCategory.map((c: any) => ({
      category: c._id,
      total: String(c.total),
      count: c.count,
    })),
    byBus: byBus.map((b: any) => ({
      busNumber: b._id,
      total: String(b.total),
      count: b.count,
    })),
  });
};

// ---- Automated sync from inventory-consuming operations ----

// Called by the part-request and repair services whenever stock leaves
// inventory for a purpose. Idempotent: one expenditure per source op,
// created on first call and kept in sync (amount/status) after.
export const upsertSourceExpenditure = async (
  params: ISourceExpenditure,
): Promise<void> => {
  const category = await resolveCategory(
    undefined,
    params.categoryName,
    params.recordedBy,
  );

  const existing = await Expenditure.findOne({
    source: params.source,
    sourceRef: params.sourceRef,
  });

  if (existing) {
    existing.status = params.status;
    existing.amount = params.amount;
    existing.category = category._id as any;
    existing.categoryName = category.name;
    existing.description = params.description;
    if (params.busId) {
      existing.bus = params.busId as any;
      existing.busNumber = params.busNumber;
    }
    await existing.save();
    return;
  }

  const expenditureId = await nextSequence(
    "expenditure_id",
    EXPENDITURE_ID_START,
  );
  await Expenditure.create({
    expenditureId,
    date: dayString(),
    amount: params.amount,
    category: category._id,
    categoryName: category.name,
    bus: params.busId,
    busNumber: params.busNumber,
    description: params.description,
    note: "",
    source: params.source,
    sourceRef: params.sourceRef,
    status: params.status,
    recordedBy: params.recordedBy,
  });
};
