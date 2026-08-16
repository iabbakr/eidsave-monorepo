import { Response, NextFunction } from "express";
import { GroupService } from "../services/group.service.js";
import type { AuthRequest } from "../middlewares/auth.js";
import type { CreateGroupBody, ContributeBody } from "../schema/groups.schema.js";

export const GroupController = {
  async listGroups(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await GroupService.listGroups(req.userId!);
      res.json(result);
    } catch (err) { next(err); }
  },

  async getGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await GroupService.getGroup(String(req.params["groupId"]), req.userId!);
      res.json(result);
    } catch (err) { next(err); }
  },

  async createGroup(req: AuthRequest & { body: CreateGroupBody }, res: Response, next: NextFunction) {
    try {
      const result = await GroupService.createGroup(req.userId!, req.body);
      res.status(201).json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async joinGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await GroupService.joinGroup(String(req.params["groupId"]), req.userId!);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },

  async contribute(req: AuthRequest & { body: ContributeBody }, res: Response, next: NextFunction) {
    try {
      const result = await GroupService.contribute(String(req.params["groupId"]), req.userId!, req.body);
      res.json({ ...result, success: true });
    } catch (err) { next(err); }
  },
};
