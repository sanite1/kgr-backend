import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  listGoalsService,
  getGoalService,
  createGoalService,
  updateGoalService,
  deleteGoalService,
  createEntryService,
  updateEntryService,
  deleteEntryService,
} from "../services/savingsGoal.service";
import {
  ICreateGoalEntry,
  ICreateSavingsGoal,
  IUpdateGoalEntry,
  IUpdateSavingsGoal,
} from "../interfaces/savingsGoal.interface";

const wrap =
  (fn: (req: Request) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendResponse(res, await fn(req));
    } catch (error) {
      next(error);
    }
  };

export const listGoals = wrap(() => listGoalsService());
export const getGoal = wrap((req) => getGoalService(req.params.id));
export const createGoal = wrap((req) =>
  createGoalService(req.body as ICreateSavingsGoal, String(req.user?._id)),
);
export const updateGoal = wrap((req) =>
  updateGoalService(req.params.id, req.body as IUpdateSavingsGoal),
);
export const deleteGoal = wrap((req) => deleteGoalService(req.params.id));
export const createEntry = wrap((req) =>
  createEntryService(
    req.params.id,
    req.body as ICreateGoalEntry,
    String(req.user?._id),
  ),
);
export const updateEntry = wrap((req) =>
  updateEntryService(
    req.params.id,
    req.params.entryId,
    req.body as IUpdateGoalEntry,
    String(req.user?._id),
  ),
);
export const deleteEntry = wrap((req) =>
  deleteEntryService(req.params.id, req.params.entryId),
);
