import { Schema, model, Document } from "mongoose";

// Atomic named sequences (e.g. the global receipt Bill ID).
export interface ICounter extends Document {
  key: string;
  value: number;
}

const counterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
});

const Counter = model<ICounter>("Counter", counterSchema);
export default Counter;
