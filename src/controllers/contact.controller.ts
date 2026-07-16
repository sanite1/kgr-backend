import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import { submitContactService } from "../services/contact.service";
import { ISubmitContactRequest } from "../interfaces/contact.interface";

export const submitContact = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await submitContactService(
      req.params.companyId,
      req.body as ISubmitContactRequest,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};
