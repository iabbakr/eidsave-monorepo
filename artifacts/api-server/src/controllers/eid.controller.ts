import { Request, Response, NextFunction } from "express";
import { EidService } from "../services/eid.service.js";

export const EidController = {
  async getDates(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EidService.getDates();
      res.json(result);
    } catch (err) { next(err); }
  },
};
