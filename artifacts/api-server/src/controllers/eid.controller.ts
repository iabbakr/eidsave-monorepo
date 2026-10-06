import { Request, Response, NextFunction } from "express";
import { computeEidWindow } from "../services/eidCalendar.service.js";

export const EidController = {
  async getDates(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const adha = computeEidWindow("adha", now);
      const fitr = computeEidWindow("fitr", now);

      res.json({
        currentHijriDate: `${adha.hijriYear} AH`,
        adha,
        fitr,
      });
    } catch (err) {
      next(err);
    }
  },
};