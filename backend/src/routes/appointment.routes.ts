import { Router } from "express";

import {
  createNewAppointment,
  getAppointments,
  getAppointment,
  cancelExistingAppointment,
  changeAppointmentStatus
} from "../controllers/appointment.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /api/v1/appointments
 *
 * Get appointments for the authenticated user.
 *
 * PATIENT -> own appointments
 * DOCTOR  -> assigned appointments
 * ADMIN   -> all appointments
 */
router.get(
  "/",
  authenticate,
  getAppointments
);

/**
 * GET /api/v1/appointments/:id
 *
 * Get a specific appointment.
 */
router.patch(
  "/:id/cancel",
  authenticate,
  cancelExistingAppointment
);
router.get(
  "/:id",
  authenticate,
  getAppointment
);

/**
 * POST /api/v1/appointments
 *
 * Create a new appointment.
 */
router.post(
  "/",
  authenticate,
  createNewAppointment
);
router.patch(
  "/:id/status",
  authenticate,
  changeAppointmentStatus
);

export default router;