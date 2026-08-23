import { Router, type IRouter } from "express";
import {
  getLocationsConfig,
  getStates,
  getCities,
  getAreas,
} from "../controllers/location.controller.js";

const router: IRouter = Router();

// Full dataset for mobile caching/store bootstrap
router.get("/config", getLocationsConfig);

// Granular query endpoints
router.get("/states", getStates);
router.get("/cities", getCities);
router.get("/areas", getAreas);

export default router;