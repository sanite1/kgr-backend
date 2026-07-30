import { Schema, model } from "mongoose";
import { ITodo } from "../interfaces/todo.interface";

const todoSchema = new Schema<ITodo>(
  {
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true },
    dueDate: { type: String, default: "", index: true },
    done: { type: Boolean, default: false, index: true },
    doneAt: { type: Date },
    doneByName: { type: String, default: "" },
    snoozedUntil: { type: Date },
    snoozedByName: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

todoSchema.index({ done: 1, dueDate: 1 });

const Todo = model<ITodo>("Todo", todoSchema);
export default Todo;
