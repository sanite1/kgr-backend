import { Document, Types } from "mongoose";

// Company Assets: the Price List format turned into a register of what
// the company owns. Each item is priced in one currency; the other side
// is worked out through the Price List's naira-per-dollar rate, so a
// rate change reprices dollar assets and leaves naira ones alone.

export type AssetCategory = "appreciating" | "depreciating";
export type AssetCurrency = "USD" | "NGN";

export interface ICompanyAsset extends Document {
  name: string;
  category: AssetCategory;
  quantity: number;
  currency: AssetCurrency; // the currency the price was entered in
  unitPrice: string; // money as a string, like everywhere else
  acquiredOn?: string; // YYYY-MM-DD
  note: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateCompanyAsset {
  name: string;
  category: AssetCategory;
  quantity: number;
  currency: AssetCurrency;
  unitPrice: number;
  acquiredOn?: string;
  note?: string;
}

export type IUpdateCompanyAsset = Partial<ICreateCompanyAsset>;
