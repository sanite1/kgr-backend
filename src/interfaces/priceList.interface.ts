import { Document, Types } from "mongoose";

// The "KGR items prices in dollars" sheet: what we buy abroad, its
// weight and dollar price. The naira totals are never stored - they are
// always usd times the single current exchange rate, so updating the
// rate reprices the whole list at once.
export interface IPriceListItem extends Document {
  name: string;
  weight: string; // as written: "21.5KG", "2kg", "47KG/0.1CBM", ""
  usd: number;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// singleton: the current rate plus the shipping notes footer
export interface IPriceListSetting extends Document {
  rate: number; // naira per dollar
  rateUpdatedBy?: Types.ObjectId;
  rateUpdatedByName?: string;
  rateUpdatedAt?: Date;
  notes: string; // the red shipping lines under the paper table
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePriceItem {
  name: string;
  weight?: string;
  usd: number;
}

export interface IUpdatePriceItem {
  name?: string;
  weight?: string;
  usd?: number;
}

export interface IUpdatePriceSettings {
  rate?: number;
  notes?: string;
}
