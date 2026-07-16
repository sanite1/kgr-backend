import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import TripPrice from "../models/TripPrice";
import {
  ISetTripPriceRequest,
  ITripPriceHistoryQuery,
} from "../interfaces/tripPrice.interface";

// the price in force right now (latest whose effectiveFrom has passed)
export const findCurrentTripPrice = async () => {
  return TripPrice.findOne({ effectiveFrom: { $lte: new Date() } })
    .sort({ effectiveFrom: -1 })
    .populate("setBy", "firstName lastName");
};

// GET /api/trip-price/current
export const getCurrentTripPriceService = async () => {
  const current = await findCurrentTripPrice();
  return new ApiResponse(
    200,
    current ? "Current trip price retrieved" : "No trip price configured yet",
    current ? current.toJSON() : null,
  );
};

// POST /api/trip-price
export const setTripPriceService = async (
  payload: ISetTripPriceRequest,
  setBy: string,
) => {
  if (Number(payload.amount) <= 0) {
    throw new ApiError(400, "Trip price must be greater than zero");
  }
  const effectiveFrom = payload.effectiveFrom
    ? new Date(payload.effectiveFrom)
    : new Date();

  const price = await TripPrice.create({
    amount: payload.amount,
    effectiveFrom,
    setBy,
    note: payload.note || "",
  });

  return new ApiResponse(201, "Trip price set successfully", price.toJSON());
};

// GET /api/trip-price/history
export const getTripPriceHistoryService = async (
  query: ITripPriceHistoryQuery,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [prices, totalItems] = await Promise.all([
    TripPrice.find()
      .sort({ effectiveFrom: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("setBy", "firstName lastName"),
    TripPrice.countDocuments(),
  ]);

  return PaginatedResponse.build(
    prices.map((p) => p.toJSON()),
    totalItems,
    page,
    pageSize,
    "Trip price history retrieved successfully",
  );
};
