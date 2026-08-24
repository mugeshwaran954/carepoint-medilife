import { Router } from "express";

import {
  createNewReminder,
  getReminders,
  getReminder
} from "../controllers/reminder.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /api/v1/reminders
 *
 * PATIENT -> own reminders
 * DOCTOR  -> own reminders
 * ADMIN   -> all reminders
 */
router.get(
  "/",
  authenticate,
  getReminders
);

/**
 * GET /api/v1/reminders/:id
 */
router.get(
  "/:id",
  authenticate,
  getReminder
);

/**
 * POST /api/v1/reminders
 *
 * DOCTOR / ADMIN only.
 */
router.post(
  "/",
  authenticate,
  createNewReminder
);

export default router;