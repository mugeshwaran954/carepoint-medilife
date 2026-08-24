import { Router } from "express";

import {
  createNewFollowUp,
  getAppointmentFollowUps,
  getFollowUp
} from "../controllers/followUp.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/appointments/:id/follow-ups",
  authenticate,
  createNewFollowUp
);

router.get(
  "/appointments/:id/follow-ups",
  authenticate,
  getAppointmentFollowUps
);

router.get(
  "/follow-ups/:followUpId",
  authenticate,
  getFollowUp
);

export default router;