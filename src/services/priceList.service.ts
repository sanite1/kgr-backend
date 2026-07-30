import ApiResponse from "../errors/apiResponse";
import ApiError from "../errors/apiError";
import PriceListItem from "../models/PriceListItem";
import PriceListSetting from "../models/PriceListSetting";
import User from "../models/User";
import {
  ICreatePriceItem,
  IUpdatePriceItem,
  IUpdatePriceSettings,
} from "../interfaces/priceList.interface";

// the paper sheet from 19th June 2026, loaded once on first use
const SEED_RATE = 1407;
const SEED_NOTES = [
  "AIR EXPRESS = 13$/KG + 1300 CLEARANCE (3-5 DAYS)",
  "AIR CARGO = 9.5$/KG + 1000 CLEARANCE (10-14 DAYS)",
  "SEA SHIPPING = 135$/CBM + 260,000/CBM CLEARANCE",
].join("\n");
const SEED_ITEMS: { name: string; weight: string; usd: number }[] = [
  { name: "Electric Motor 8kw", weight: "21.5KG", usd: 247 },
  { name: "Motor Controller", weight: "2.7KG", usd: 139 },
  { name: "Complete Gearbox", weight: "18.5KG", usd: 101 },
  { name: "Gear Box Cover", weight: "8KG", usd: 45 },
  { name: "DALY BMS 250A OLD", weight: "", usd: 91 },
  { name: "DALY BMS 250A NEW", weight: "", usd: 93.4 },
  { name: "DALY BMS 150A", weight: "", usd: 58.6 },
  { name: "JK BMS 200A", weight: "", usd: 64.78 },
  { name: "30A CHARGER SINGLE PHASE", weight: "", usd: 260 },
  { name: "40A CHARGER SINGLE PHASE", weight: "", usd: 390 },
  { name: "50A CHARGER SINGLE PHASE", weight: "", usd: 480 },
  { name: "MPPT CONTROLLER SOLAR 120A", weight: "2KG", usd: 160 },
  { name: "MPPT CONTROLLER BOARD 120", weight: "2KG", usd: 150.2 },
  { name: "MPPT CONTROLLER 100A", weight: "2KG", usd: 139 },
  { name: "MPPT CONTROLLER BOARD 100A", weight: "2KG", usd: 124.2 },
  { name: "KEKE CONVERSION KITS", weight: "47KG/0.1CBM", usd: 429.5 },
  { name: "Sprokets (20H, 24H, 23H, 20H)", weight: "0.4KG", usd: 4.5 },
  { name: "Sprokets (27H, 43H)", weight: "0.6KG", usd: 8.5 },
];

// first ever call creates the settings doc and loads the paper sheet;
// after that the list belongs entirely to the users
const ensureSeeded = async (userId: string) => {
  const existing = await PriceListSetting.findOne();
  if (existing) return existing;
  await PriceListItem.insertMany(
    SEED_ITEMS.map((item) => ({ ...item, createdBy: userId })),
  );
  return PriceListSetting.create({ rate: SEED_RATE, notes: SEED_NOTES });
};

// GET /api/price-list: the rate, the notes and every item
export const getPriceListService = async (requesterId: string) => {
  const settings = await ensureSeeded(requesterId);
  const items = await PriceListItem.find().sort({ createdAt: 1 });

  return new ApiResponse(200, "Price list retrieved successfully", {
    rate: settings.rate,
    rateUpdatedByName: settings.rateUpdatedByName || "",
    rateUpdatedAt: settings.rateUpdatedAt,
    notes: settings.notes,
    items: items.map((i) => i.toJSON()),
  });
};

// POST /api/price-list/items (managers)
export const createPriceItemService = async (
  payload: ICreatePriceItem,
  createdBy: string,
) => {
  const item = await PriceListItem.create({
    name: payload.name.trim(),
    weight: payload.weight?.trim() || "",
    usd: payload.usd,
    createdBy,
  });
  return new ApiResponse(
    201,
    `"${item.name}" added to the price list`,
    item.toJSON(),
  );
};

// PATCH /api/price-list/items/:id (managers)
export const updatePriceItemService = async (
  id: string,
  payload: IUpdatePriceItem,
) => {
  const item = await PriceListItem.findById(id);
  if (!item) throw new ApiError(404, "Item not found");

  if (payload.name !== undefined) item.name = payload.name.trim();
  if (payload.weight !== undefined) item.weight = payload.weight.trim();
  if (payload.usd !== undefined) item.usd = payload.usd;
  await item.save();

  return new ApiResponse(200, "Item updated successfully", item.toJSON());
};

// DELETE /api/price-list/items/:id (managers)
export const deletePriceItemService = async (id: string) => {
  const item = await PriceListItem.findById(id);
  if (!item) throw new ApiError(404, "Item not found");
  await item.deleteOne();
  return new ApiResponse(
    200,
    `"${item.name}" removed from the price list`,
    undefined,
  );
};

// PATCH /api/price-list/settings (managers): the rate update that
// reprices everything, and the shipping notes
export const updatePriceSettingsService = async (
  payload: IUpdatePriceSettings,
  requesterId: string,
) => {
  const settings = await ensureSeeded(requesterId);

  if (payload.rate !== undefined && payload.rate !== settings.rate) {
    const user = await User.findById(requesterId);
    settings.rate = payload.rate;
    settings.rateUpdatedBy = requesterId as any;
    settings.rateUpdatedByName = user
      ? `${user.firstName} ${user.lastName}`.trim()
      : "";
    settings.rateUpdatedAt = new Date();
  }
  if (payload.notes !== undefined) settings.notes = payload.notes;
  await settings.save();

  return new ApiResponse(200, "Price list settings updated", {
    rate: settings.rate,
    rateUpdatedByName: settings.rateUpdatedByName || "",
    rateUpdatedAt: settings.rateUpdatedAt,
    notes: settings.notes,
  });
};
