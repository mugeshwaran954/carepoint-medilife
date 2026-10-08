import { Router } from "express";
import {
  createPostVisitSummary,
  getPostVisitSummary
} from "../controllers/postVisit.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createPostVisitSummary);
router.get("/:appointmentId", authenticate, getPostVisitSummary);

export default router;
