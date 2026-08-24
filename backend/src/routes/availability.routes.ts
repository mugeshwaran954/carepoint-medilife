import { Router } from "express";

import {
  getAvailability,
  createDoctorAvailability,
  updateDoctorAvailability,
  removeDoctorAvailability
} from "../controllers/availability.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/:id/availability",
  getAvailability
);

router.post(
  "/:id/availability",
  authenticate,
  createDoctorAvailability
);

router.patch(
  "/:id/availability/:availabilityId",
  authenticate,
  updateDoctorAvailability
);

router.delete(
  "/:id/availability/:availabilityId",
  authenticate,
  removeDoctorAvailability
);

export default router;