import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Todo from "../models/Todo";
import User from "../models/User";
import { dayString } from "../helpers/day";
import {
  ICreateTodo,
  IUpdateTodo,
  ITodosQuery,
  ISnoozeTodo,
  TodoView,
} from "../interfaces/todo.interface";

const nameOf = async (id: string): Promise<string> => {
  const user = await User.findById(id);
  return user ? `${user.firstName} ${user.lastName}`.trim() : "";
};

// which items belong to which view. "Attention" is the ringing pile:
// open, dated today or earlier, and not asleep.
const viewFilter = (view: TodoView): Record<string, any> => {
  const now = new Date();
  const today = dayString();
  if (view === "all") return {};
  const awake = {
    $or: [{ snoozedUntil: null }, { snoozedUntil: { $lte: now } }],
  };
  if (view === "attention") {
    return {
      done: false,
      dueDate: { $ne: "", $lte: today },
      ...awake,
    };
  }
  if (view === "upcoming") {
    return {
      done: false,
      $and: [{ $or: [{ dueDate: "" }, { dueDate: { $gt: today } }] }, awake],
    };
  }
  if (view === "snoozed") {
    return { done: false, snoozedUntil: { $gt: now } };
  }
  return { done: true };
};

const viewSort = (view: TodoView): Record<string, 1 | -1> => {
  // everything on one page: open items first, finished ones at the end
  if (view === "all") return { done: 1, dueDate: 1, createdAt: -1 };
  if (view === "attention") return { dueDate: 1, createdAt: 1 };
  if (view === "upcoming") return { dueDate: 1, createdAt: -1 };
  if (view === "snoozed") return { snoozedUntil: 1 };
  return { doneAt: -1 };
};

// GET /api/todos?view=
export const getTodosService = async (query: ITodosQuery) => {
  const view: TodoView = query.view || "attention";
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter = viewFilter(view);
  const [items, totalItems, attention, upcoming, snoozed, done] =
    await Promise.all([
      Todo.find(filter)
        .sort(viewSort(view))
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Todo.countDocuments(filter),
      Todo.countDocuments(viewFilter("attention")),
      Todo.countDocuments(viewFilter("upcoming")),
      Todo.countDocuments(viewFilter("snoozed")),
      Todo.countDocuments(viewFilter("done")),
    ]);

  const result = PaginatedResponse.build(
    items.map((t) => t.toJSON()),
    totalItems,
    page,
    pageSize,
    "To-dos retrieved successfully",
  );
  (result as unknown as { extra: Record<string, unknown> }).extra = {
    counts: { attention, upcoming, snoozed, done },
  };
  return result;
};

// POST /api/todos
export const createTodoService = async (
  payload: ICreateTodo,
  createdBy: string,
) => {
  const todo = await Todo.create({
    title: payload.title.trim(),
    notes: payload.notes?.trim() || "",
    dueDate: payload.dueDate || "",
    createdBy,
    createdByName: await nameOf(createdBy),
  });
  return new ApiResponse(
    201,
    `"${todo.title}" added to the to-do list`,
    todo.toJSON(),
  );
};

// PATCH /api/todos/:id
export const updateTodoService = async (id: string, payload: IUpdateTodo) => {
  const todo = await Todo.findById(id);
  if (!todo) throw new ApiError(404, "To-do not found");

  if (payload.title !== undefined) todo.title = payload.title.trim();
  if (payload.notes !== undefined) todo.notes = payload.notes.trim();
  if (payload.dueDate !== undefined) todo.dueDate = payload.dueDate;
  await todo.save();

  return new ApiResponse(200, "To-do updated successfully", todo.toJSON());
};

// POST /api/todos/:id/done and /reopen
export const setTodoDoneService = async (
  id: string,
  done: boolean,
  by: string,
) => {
  const todo = await Todo.findById(id);
  if (!todo) throw new ApiError(404, "To-do not found");

  todo.done = done;
  todo.doneAt = done ? new Date() : undefined;
  todo.doneByName = done ? await nameOf(by) : "";
  if (done) {
    todo.snoozedUntil = undefined;
    todo.snoozedByName = "";
  }
  await todo.save();

  return new ApiResponse(
    200,
    done ? `"${todo.title}" marked done` : `"${todo.title}" reopened`,
    todo.toJSON(),
  );
};

// POST /api/todos/:id/snooze: quiet the reminder for a while; it comes
// back on its own when the time passes. days 0 wakes it now.
export const snoozeTodoService = async (
  id: string,
  payload: ISnoozeTodo,
  by: string,
) => {
  const todo = await Todo.findById(id);
  if (!todo) throw new ApiError(404, "To-do not found");
  if (todo.done) throw new ApiError(400, "A finished to-do has no reminder");

  if (payload.days === 0) {
    todo.snoozedUntil = undefined;
    todo.snoozedByName = "";
    await todo.save();
    return new ApiResponse(
      200,
      `"${todo.title}" is ringing again`,
      todo.toJSON(),
    );
  }

  const until = new Date();
  until.setDate(until.getDate() + payload.days);
  todo.snoozedUntil = until;
  todo.snoozedByName = await nameOf(by);
  await todo.save();

  return new ApiResponse(
    200,
    `"${todo.title}" snoozed for ${payload.days} ${payload.days === 1 ? "day" : "days"}`,
    todo.toJSON(),
  );
};

// DELETE /api/todos/:id
export const deleteTodoService = async (id: string) => {
  const todo = await Todo.findById(id);
  if (!todo) throw new ApiError(404, "To-do not found");
  await todo.deleteOne();
  return new ApiResponse(
    200,
    `"${todo.title}" removed from the list`,
    undefined,
  );
};
