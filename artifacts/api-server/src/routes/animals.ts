import { Router } from "express";
import { AnimalController } from "../controllers/animal.controller.js";

const router = Router();

router.get("/", AnimalController.listAnimals);
router.get("/:id", AnimalController.getAnimal);

export { router as animalsRouter };
