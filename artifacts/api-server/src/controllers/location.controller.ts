import type { Request, Response } from "express";
import {
  NIGERIAN_LOCATIONS,
  getAllStates,
  getCitiesByState,
  getAreasByCity,
} from "../constants/locations.js";
import { cacheGet, cacheSet, cacheKey } from "../lib/cache.js";

const LOCATIONS_CACHE_KEY = cacheKey("system", "nigerian_locations");
const ONE_DAY_SECONDS = 86400;

export const getLocationsConfig = async (_req: Request, res: Response): Promise<Response> => {
  res.setHeader("Cache-Control", `public, max-age=${ONE_DAY_SECONDS}, stale-while-revalidate=3600`);

  const cached = await cacheGet<typeof NIGERIAN_LOCATIONS>(LOCATIONS_CACHE_KEY);
  if (cached) {
    return res.status(200).json({ success: true, data: cached });
  }

  await cacheSet(LOCATIONS_CACHE_KEY, NIGERIAN_LOCATIONS, ONE_DAY_SECONDS);
  return res.status(200).json({ success: true, data: NIGERIAN_LOCATIONS });
};

export const getStates = (_req: Request, res: Response): Response => {
  res.setHeader("Cache-Control", `public, max-age=${ONE_DAY_SECONDS}`);
  return res.status(200).json({ success: true, data: getAllStates() });
};

export const getCities = (req: Request, res: Response): Response => {
  const state = req.query["state"] as string | undefined;
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).json({ success: true, data: getCitiesByState(state) });
};

export const getAreas = (req: Request, res: Response): Response => {
  const state = req.query["state"] as string | undefined;
  const city = req.query["city"] as string | undefined;
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).json({ success: true, data: getAreasByCity(state, city) });
};