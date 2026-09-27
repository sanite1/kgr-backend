import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getCompanyAssetsService,
  createCompanyAssetService,
  updateCompanyAssetService,
  deleteCompanyAssetService,
} from "../services/companyAsset.service";
import {
  ICreateCompanyAsset,
  IUpdateCompanyAsset,
} from "../interfaces/companyAsset.interface";

const wrap =
  (fn: (req: Request) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendResponse(res, await fn(req));
    } catch (error) {
      next(error);
    }
  };

export const getCompanyAssets = wrap(() => getCompanyAssetsService());
export const createCompanyAsset = wrap((req) =>
  createCompanyAssetService(
    req.body as ICreateCompanyAsset,
    String(req.user?._id),
  ),
);
export const updateCompanyAsset = wrap((req) =>
  updateCompanyAssetService(req.params.id, req.body as IUpdateCompanyAsset),
);
export const deleteCompanyAsset = wrap((req) =>
  deleteCompanyAssetService(req.params.id),
);
