import { Document, Types } from "mongoose";

// The company's shared memory: things to buy, meetings, anything that
// must not slip the mind. An item with a date starts ringing when the
// date arrives, and can be snoozed like the battery report.
export type TodoView = "all" | "attention" | "upcoming" | "snoozed" | "done";

export interface ITodo extends Document {
  title: string;
  notes: string;
  dueDate: string; // YYYY-MM-DD, "" = anytime, no reminder
  done: boolean;
  doneAt?: Date;
  doneByName?: string;
  snoozedUntil?: Date; // ringing pauses until this passes
  snoozedByName?: string;
  createdBy: Types.ObjectId;
  createdByName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateTodo {
  title: string;
  notes?: string;
  dueDate?: string;
}

export interface IUpdateTodo {
  title?: string;
  notes?: string;
  dueDate?: string; // "" clears the date
}

export interface ITodosQuery {
  view?: TodoView;
  page?: number;
  pageSize?: number;
}

export interface ISnoozeTodo {
  days: number; // 0 wakes it immediately
}
