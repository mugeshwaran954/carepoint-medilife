import { Router } from "express";
import {
  getDoctors,
  getDoctor
} from "../controllers/doctor.controller.js";

const router = Router();

router.get("/", getDoctors);

router.get("/:id", getDoctor);

export default router;