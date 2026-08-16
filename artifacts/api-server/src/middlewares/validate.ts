import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i: { path: (string | number)[]; message: string }) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      res.status(400).json({ message: "Validation failed", issues, success: false });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues.map((i: { path: (string | number)[]; message: string }) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      res.status(400).json({ message: "Validation failed", issues, success: false });
      return;
    }
    req.query = result.data as Record<string, string>;
    next();
  };
}
