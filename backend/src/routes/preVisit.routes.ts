import { Router } from "express";

import {
  createNewPreVisitSummary,
  getPreVisitSummary
} from "../controllers/preVisit.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  createNewPreVisitSummary
);

router.get(
  "/:appointmentId",
  authenticate,
  getPreVisitSummary
);

export default router;