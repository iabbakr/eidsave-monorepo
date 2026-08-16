import { Request, Response, NextFunction } from "express";
import { AnimalService } from "../services/animal.service.js";
import type { AuthRequest } from "../middlewares/auth.js";

export const AnimalController = {
  async listAnimals(req: Request, res: Response, next: NextFunction) {
    try {
      const { eidType, category } = req.query as { eidType?: string; category?: string };
      const result = await AnimalService.listAnimals(
        (eidType || category) ? { eidType, category } : undefined,
      );
      res.json(result);
    } catch (err) { next(err); }
  },

  async getAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AnimalService.getAnimal(String(req.params["id"]));
      res.json(result);
    } catch (err) { next(err); }
  },

  async createAnimal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AnimalService.createAnimal(req.body);
      res.status(201).json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async updateAnimal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AnimalService.updateAnimal(String(req.params["id"]), req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },
};
