import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const handleHealthCheck = (_req: any, res: any) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

// Responds to both /api/health and /api/healthz
router.get("/health", handleHealthCheck);
router.get("/healthz", handleHealthCheck);

export default router;