import mongoose from "mongoose";
import ApiResponse from "../errors/apiResponse";
import ApiError from "../errors/apiError";
import CompanyAsset from "../models/CompanyAsset";
import PriceListSetting from "../models/PriceListSetting";
import User from "../models/User";
import logger from "../config/logger";
import { nextSequence } from "../helpers/sequence";
import {
  ICreateCompanyAsset,
  IUpdateCompanyAsset,
} from "../interfaces/companyAsset.interface";

// One-time migration: managers and admins with customized tab access
// saved before this module existed get the new key exactly once.
const grantAssetsOnce = async () => {
  const run = await nextSequence("migration_access_assets", 1);
  if (run !== 1) return;
  const res = await User.updateMany(
    { role: { $in: ["admin", "manager"] }, access: { $type: "array" } },
    { $addToSet: { access: "assets" } },
  );
  logger.info(`Assets access granted to ${res.modifiedCount} user(s)`);
};
const runGrant = () =>
  grantAssetsOnce().catch((error: Error) =>
    logger.error("Assets access migration failed", { message: error.message }),
  );
if (mongoose.connection.readyState === 1) {
  void runGrant();
} else {
  mongoose.connection.once("connected", () => void runGrant());
}

const money = (n: number) => Math.round(n * 100) / 100;

// the Price List owns the rate; assets only read it. Until somebody
// has opened the Price List there is no settings doc, so a missing one
// is a hard error rather than a silent zero valuation.
const currentRate = async (): Promise<number> => {
  const settings = await PriceListSetting.findOne();
  if (!settings || !(settings.rate > 0)) {
    throw new ApiError(
      409,
      "Set the naira-per-dollar rate on the Price List page first",
    );
  }
  return settings.rate;
};

// GET /api/assets: every asset priced both ways, plus the totals
export const getCompanyAssetsService = async () => {
  const [assets, rate] = await Promise.all([
    CompanyAsset.find().sort({ category: 1, name: 1 }),
    currentRate(),
  ]);

  const items = assets.map((a) => {
    const price = Number(a.unitPrice);
    const usd = a.currency === "USD" ? price : rate > 0 ? price / rate : 0;
    const ngn = a.currency === "NGN" ? price : price * rate;
    return {
      ...a.toJSON(),
      unitUsd: money(usd),
      unitNgn: money(ngn),
      totalUsd: money(usd * a.quantity),
      totalNgn: money(ngn * a.quantity),
    };
  });

  const sum = (
    rows: typeof items,
    pick: (r: (typeof items)[number]) => number,
  ) => money(rows.reduce((s, r) => s + pick(r), 0));
  const byCategory = (category: string) =>
    items.filter((i) => i.category === category);

  return new ApiResponse(200, "Company assets retrieved successfully", {
    rate,
    items,
    totals: {
      count: items.length,
      totalUsd: sum(items, (r) => r.totalUsd),
      totalNgn: sum(items, (r) => r.totalNgn),
      appreciating: {
        count: byCategory("appreciating").length,
        totalUsd: sum(byCategory("appreciating"), (r) => r.totalUsd),
        totalNgn: sum(byCategory("appreciating"), (r) => r.totalNgn),
      },
      depreciating: {
        count: byCategory("depreciating").length,
        totalUsd: sum(byCategory("depreciating"), (r) => r.totalUsd),
        totalNgn: sum(byCategory("depreciating"), (r) => r.totalNgn),
      },
    },
  });
};

// POST /api/assets
export const createCompanyAssetService = async (
  payload: ICreateCompanyAsset,
  createdBy: string,
) => {
  if (!(payload.unitPrice >= 0)) {
    throw new ApiError(400, "Price cannot be negative");
  }
  const asset = await CompanyAsset.create({
    name: payload.name.trim(),
    category: payload.category,
    quantity: payload.quantity,
    currency: payload.currency,
    unitPrice: String(payload.unitPrice),
    acquiredOn: payload.acquiredOn,
    note: payload.note?.trim() || "",
    createdBy,
  });
  return new ApiResponse(201, `${asset.name} added`, asset.toJSON());
};

// PATCH /api/assets/:id
export const updateCompanyAssetService = async (
  id: string,
  payload: IUpdateCompanyAsset,
) => {
  const asset = await CompanyAsset.findById(id);
  if (!asset) throw new ApiError(404, "Asset not found");
  if (payload.name !== undefined) asset.name = payload.name.trim();
  if (payload.category !== undefined) asset.category = payload.category;
  if (payload.quantity !== undefined) asset.quantity = payload.quantity;
  if (payload.currency !== undefined) asset.currency = payload.currency;
  if (payload.unitPrice !== undefined) {
    if (!(payload.unitPrice >= 0)) {
      throw new ApiError(400, "Price cannot be negative");
    }
    asset.unitPrice = String(payload.unitPrice);
  }
  if (payload.acquiredOn !== undefined) {
    asset.acquiredOn = payload.acquiredOn || undefined;
  }
  if (payload.note !== undefined) asset.note = payload.note.trim();
  await asset.save();
  return new ApiResponse(200, `${asset.name} updated`, asset.toJSON());
};

// DELETE /api/assets/:id
export const deleteCompanyAssetService = async (id: string) => {
  const asset = await CompanyAsset.findById(id);
  if (!asset) throw new ApiError(404, "Asset not found");
  await asset.deleteOne();
  return new ApiResponse(200, `${asset.name} removed`, undefined);
};
